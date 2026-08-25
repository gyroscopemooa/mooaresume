-- Lets the applicant choose how much risk the finished draft carries.
--
-- The premise, from the consulting side of this product: a cover letter has no
-- correct answer, because a person reads it. One reviewer rejects a draft for a
-- typo; the next hires on the story and never notices. So the product stops
-- promising the right answer and asks which way the applicant wants to go.
--
--   SAFE        모서리를 깎아 감점될 이유를 줄인다
--   BALANCED    개성은 두고 위험한 곳만 다듬는다 (기본값)
--   CONVICTION  맞는 회사에 강하게 어필한다
--
-- Stored on the run rather than passed at analysis time because the run is
-- created before checkout and read back after it. A value held only in the
-- browser would be lost the moment the applicant is redirected to pay.
--
-- The function below is the body from 20260816153000 with one column added to
-- the analysis_runs insert. Nothing else in it changed.

begin;

alter table public.analysis_runs
  add column if not exists editing_stance text not null default 'BALANCED'
    check (editing_stance in ('SAFE', 'BALANCED', 'CONVICTION'));

create or replace function public.create_application_case_from_plan(p_plan jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  case_id uuid;
  snapshot_id uuid;
  run_id uuid;
  document_id uuid;
  version_id uuid;
  document_item jsonb;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  if jsonb_typeof(p_plan->'documents') <> 'array' or jsonb_array_length(p_plan->'documents') = 0 then
    raise exception 'DOCUMENT_REQUIRED' using errcode = '22023';
  end if;

  insert into public.application_cases (
    owner_user_id, title, company_name, role_name, status
  ) values (
    current_user_id,
    p_plan->>'title',
    nullif(p_plan->>'companyName', ''),
    nullif(p_plan->>'roleName', ''),
    'DRAFT'
  ) returning id into case_id;

  insert into public.submission_snapshots (
    application_case_id, owner_user_id, label
  ) values (
    case_id, current_user_id, '최초 분석 입력'
  ) returning id into snapshot_id;

  for document_item in select value from jsonb_array_elements(p_plan->'documents')
  loop
    insert into public.documents (
      application_case_id, owner_user_id, kind, title
    ) values (
      case_id,
      current_user_id,
      (document_item->>'kind')::public.document_kind,
      document_item->>'title'
    ) returning id into document_id;

    insert into public.document_versions (
      document_id,
      owner_user_id,
      version_number,
      source_type,
      original_filename,
      normalized_text,
      content_sha256,
      character_count
    ) values (
      document_id,
      current_user_id,
      1,
      document_item->>'sourceType',
      nullif(document_item->>'originalFilename', ''),
      document_item->>'normalizedText',
      encode(extensions.digest(convert_to(document_item->>'normalizedText', 'UTF8'), 'sha256'), 'hex'),
      char_length(regexp_replace(document_item->>'normalizedText', '\s', '', 'g'))
    ) returning id into version_id;

    insert into public.submission_snapshot_items (
      snapshot_id, document_version_id, owner_user_id, purpose
    ) values (
      snapshot_id,
      version_id,
      current_user_id,
      document_item->>'purpose'
    );
  end loop;

  insert into public.analysis_runs (
    submission_snapshot_id,
    application_case_id,
    owner_user_id,
    product,
    writing_mode,
    writing_style,
    editing_stance,
    target_length,
    status,
    schema_version
  ) values (
    snapshot_id,
    case_id,
    current_user_id,
    p_plan->>'product',
    p_plan->>'writingMode',
    p_plan->>'writingStyle',
    -- Absent on any caller that predates the setting, and on QUICK, which does
    -- not offer it. Both mean the middle stance, which is how those runs have
    -- always behaved.
    coalesce(nullif(p_plan->>'editingStance', ''), 'BALANCED'),
    (p_plan->>'targetLength')::integer,
    'PENDING',
    '1.0'
  ) returning id into run_id;

  return jsonb_build_object(
    'applicationCaseId', case_id,
    'submissionSnapshotId', snapshot_id,
    'analysisRunId', run_id
  );
end;
$$;

revoke all on function public.create_application_case_from_plan(jsonb) from public;
grant execute on function public.create_application_case_from_plan(jsonb) to authenticated;

/*
 * Same body as 20260824010000, with one line added: the run's stance travels
 * out with the request so the prompt can act on it.
 *
 * Without this the column would be written at checkout and then never read —
 * the applicant would pick 소신 강조형, pay, and get the default anyway.
 */
create or replace function public.begin_quick_analysis(p_analysis_run_id uuid, p_owner_user_id uuid)
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
  if target_run.product not in ('QUICK', 'PRO', 'FINAL') or target_run.status <> 'PENDING' then
    raise exception 'ANALYSIS_RUN_NOT_STARTABLE' using errcode = '55000';
  end if;
  if target_run.attempt_count >= 3 then
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
    and ae.product = target_run.product and ae.status = 'ACTIVE'
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
      when 'REVISION_REQUEST' then 'revision_request'
      else 'portfolio' end,
    'text', v.normalized_text,
    'filename', v.original_filename
  ) order by si.purpose, d.created_at) into request_documents
  from public.submission_snapshot_items si
  join public.document_versions v on v.id = si.document_version_id
  join public.documents d on d.id = v.document_id
  where si.snapshot_id = target_run.submission_snapshot_id
    and v.normalized_text is not null
    and length(btrim(v.normalized_text)) > 0
    and (d.kind not in ('OTHER', 'REVISION_REQUEST') or target_run.product in ('PRO', 'FINAL'));

  return jsonb_build_object(
    'analysisRunId', target_run.id,
    'request', jsonb_build_object(
      'requestId', target_run.application_case_id,
      'product', target_run.product,
      'writingMode', target_run.writing_mode,
      'writingStyle', target_run.writing_style,
      'editingStance', target_run.editing_stance,
      'targetLength', target_run.target_length,
      'documents', coalesce(request_documents, '[]'::jsonb)
    )
  );
end;
$$;

commit;
