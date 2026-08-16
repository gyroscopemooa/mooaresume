begin;

create function public.begin_quick_analysis(p_analysis_run_id uuid, p_owner_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_run public.analysis_runs%rowtype;
  entitlement_id uuid;
  snapshot_characters integer;
  request_documents jsonb;
begin
  select * into target_run from public.analysis_runs
  where id = p_analysis_run_id and owner_user_id = p_owner_user_id
  for update;

  if target_run.id is null then
    raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_run.product <> 'QUICK' or target_run.status <> 'PENDING' then
    raise exception 'ANALYSIS_RUN_NOT_STARTABLE' using errcode = '55000';
  end if;
  if target_run.attempt_count >= 2 then
    raise exception 'ANALYSIS_ATTEMPT_LIMIT_REACHED' using errcode = '55000';
  end if;

  select coalesce(sum(v.character_count), 0)::integer into snapshot_characters
  from public.submission_snapshot_items si
  join public.document_versions v on v.id = si.document_version_id
  where si.snapshot_id = target_run.submission_snapshot_id
    and si.purpose = 'PRIMARY';

  if snapshot_characters <= 0 then
    raise exception 'PRIMARY_DOCUMENT_REQUIRED' using errcode = '22023';
  end if;

  select ae.id into entitlement_id from public.analysis_entitlements ae
  where ae.application_case_id = target_run.application_case_id
    and ae.owner_user_id = p_owner_user_id
    and ae.product = 'QUICK' and ae.status = 'ACTIVE'
    and ae.allowed_characters >= snapshot_characters
  order by ae.created_at for update skip locked limit 1;

  if entitlement_id is null then
    raise exception 'ACTIVE_ENTITLEMENT_NOT_FOUND' using errcode = '42501';
  end if;

  update public.analysis_entitlements
  set status = 'CONSUMED', consumed_by_analysis_run_id = target_run.id,
      consumed_at = timezone('utc', now())
  where id = entitlement_id;

  update public.analysis_runs
  set status = 'RUNNING', started_at = timezone('utc', now()), failure_code = null,
      attempt_count = attempt_count + 1
  where id = target_run.id;

  select jsonb_agg(jsonb_build_object(
    'kind', case d.kind
      when 'COVER_LETTER' then 'cover_letter'
      when 'JOB_POSTING' then 'job_posting'
      when 'RESUME' then 'resume'
      when 'CAREER_DOCUMENT' then 'career_description'
      when 'PORTFOLIO' then 'portfolio'
      else 'portfolio' end,
    'text', v.normalized_text,
    'filename', v.original_filename
  ) order by si.purpose, d.created_at) into request_documents
  from public.submission_snapshot_items si
  join public.document_versions v on v.id = si.document_version_id
  join public.documents d on d.id = v.document_id
  where si.snapshot_id = target_run.submission_snapshot_id
    and v.normalized_text is not null
    and d.kind <> 'OTHER';

  return jsonb_build_object(
    'analysisRunId', target_run.id,
    'request', jsonb_build_object(
      'requestId', target_run.application_case_id,
      'product', target_run.product,
      'writingMode', target_run.writing_mode,
      'writingStyle', target_run.writing_style,
      'targetLength', target_run.target_length,
      'documents', coalesce(request_documents, '[]'::jsonb)
    )
  );
end;
$$;

create function public.complete_quick_analysis(
  p_analysis_run_id uuid, p_owner_user_id uuid, p_result jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.analysis_runs
    where id = p_analysis_run_id and owner_user_id = p_owner_user_id and status = 'RUNNING'
    for update
  ) then
    raise exception 'ANALYSIS_RUN_NOT_COMPLETABLE' using errcode = '55000';
  end if;

  insert into public.analysis_results (
    analysis_run_id, application_case_id, owner_user_id, schema_version, result_data
  )
  select id, application_case_id, owner_user_id, p_result->>'schemaVersion', p_result
  from public.analysis_runs where id = p_analysis_run_id
  on conflict (analysis_run_id) do nothing;

  update public.analysis_runs
  set status = 'COMPLETED',
      provider = p_result#>>'{analysisRun,provider}',
      model = p_result#>>'{analysisRun,model}',
      prompt_version = p_result#>>'{analysisRun,promptVersion}',
      rubric_version = p_result#>>'{analysisRun,rubricVersion}',
      schema_version = p_result#>>'{analysisRun,schemaVersion}',
      response_id = nullif(p_result#>>'{analysisRun,responseId}', ''),
      input_tokens = nullif(p_result#>>'{analysisRun,inputTokens}', '')::integer,
      output_tokens = nullif(p_result#>>'{analysisRun,outputTokens}', '')::integer,
      total_tokens = nullif(p_result#>>'{analysisRun,totalTokens}', '')::integer,
      completed_at = timezone('utc', now())
  where id = p_analysis_run_id;
end;
$$;

create function public.fail_quick_analysis(
  p_analysis_run_id uuid, p_owner_user_id uuid, p_failure_code text,
  p_retryable boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_run public.analysis_runs%rowtype;
begin
  select * into target_run from public.analysis_runs
  where id = p_analysis_run_id and owner_user_id = p_owner_user_id
    and status = 'RUNNING'
  for update;

  if target_run.id is null then
    raise exception 'ANALYSIS_RUN_NOT_FAILABLE' using errcode = '55000';
  end if;

  update public.analysis_entitlements
  set status = 'ACTIVE', consumed_by_analysis_run_id = null, consumed_at = null
  where owner_user_id = p_owner_user_id
    and consumed_by_analysis_run_id = p_analysis_run_id
    and status = 'CONSUMED';

  if p_retryable and target_run.attempt_count < 2 then
    update public.analysis_runs
    set status = 'PENDING', failure_code = left(p_failure_code, 80),
        started_at = null, completed_at = null
    where id = p_analysis_run_id;
    return;
  end if;

  update public.analysis_runs
  set status = 'FAILED', failure_code = left(p_failure_code, 80),
      completed_at = timezone('utc', now())
  where id = p_analysis_run_id;
end;
$$;

revoke all on function public.begin_quick_analysis(uuid, uuid) from public;
revoke all on function public.complete_quick_analysis(uuid, uuid, jsonb) from public;
revoke all on function public.fail_quick_analysis(uuid, uuid, text, boolean) from public;
grant execute on function public.begin_quick_analysis(uuid, uuid) to service_role;
grant execute on function public.complete_quick_analysis(uuid, uuid, jsonb) to service_role;
grant execute on function public.fail_quick_analysis(uuid, uuid, text, boolean) to service_role;

commit;
