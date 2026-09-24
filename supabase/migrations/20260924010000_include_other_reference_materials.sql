begin;

-- PRO/FINAL의 OTHER 파일은 과거 지원서와 경력 사실이 섞일 수 있는 참고자료다.
-- QUICK에서는 계속 제외하고, 유료 분석의 고정 참고자료 예산 안에서 마지막에 읽는다.
create or replace function public.begin_quick_analysis(p_analysis_run_id uuid, p_owner_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare target_run public.analysis_runs%rowtype; entitlement_id uuid; entitlement_order_id uuid;
  paid boolean; snapshot_characters integer; request_documents jsonb; per_document_limit integer; reference_budget integer;
begin
  select * into target_run from public.analysis_runs where id = p_analysis_run_id and owner_user_id = p_owner_user_id for update;
  if target_run.id is null then raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode = 'P0002'; end if;
  if target_run.product not in ('QUICK', 'PRO', 'FINAL') or target_run.status <> 'PENDING' then raise exception 'ANALYSIS_RUN_NOT_STARTABLE' using errcode = '55000'; end if;
  if target_run.attempt_count >= 3 then raise exception 'ANALYSIS_ATTEMPT_LIMIT_REACHED' using errcode = '55000'; end if;
  select coalesce(sum(v.character_count), 0)::integer into snapshot_characters from public.submission_snapshot_items si join public.document_versions v on v.id = si.document_version_id where si.snapshot_id = target_run.submission_snapshot_id and si.purpose = 'PRIMARY';
  if snapshot_characters <= 0 then raise exception 'PRIMARY_DOCUMENT_REQUIRED' using errcode = '22023'; end if;
  select ae.id, ae.billing_order_id into entitlement_id, entitlement_order_id from public.analysis_entitlements ae where ae.application_case_id = target_run.application_case_id and ae.owner_user_id = p_owner_user_id and ae.product = target_run.product and ae.status = 'ACTIVE' and ae.allowed_characters >= snapshot_characters order by ae.created_at for update skip locked limit 1;
  if entitlement_id is null then raise exception 'ACTIVE_ENTITLEMENT_NOT_FOUND' using errcode = '42501'; end if;
  select coalesce(bo.amount, 0) > 0 into paid from public.billing_orders bo where bo.id = entitlement_order_id;
  paid := coalesce(paid, false); per_document_limit := 20000; reference_budget := case when target_run.product = 'QUICK' then 20000 else 60000 end;
  if not paid then per_document_limit := per_document_limit / 2; reference_budget := reference_budget / 2; end if;
  update public.analysis_entitlements set status = 'CONSUMED', consumed_by_analysis_run_id = target_run.id, consumed_at = timezone('utc', now()) where id = entitlement_id;
  update public.analysis_runs set status = 'RUNNING', started_at = timezone('utc', now()), failure_code = null, attempt_count = attempt_count + 1 where id = target_run.id;
  with visible as (
    select si.purpose, d.kind, d.created_at, v.original_filename, left(v.normalized_text, per_document_limit) as text,
      case d.kind when 'JOB_POSTING' then 1 when 'RESUME' then 2 when 'CERTIFICATE' then 3 when 'APPLICANT_NOTE' then 4 when 'CAREER_DOCUMENT' then 5 when 'REVISION_REQUEST' then 6 when 'PORTFOLIO' then 7 when 'OTHER' then 8 else 9 end as priority
    from public.submission_snapshot_items si join public.document_versions v on v.id = si.document_version_id join public.documents d on d.id = v.document_id
    where si.snapshot_id = target_run.submission_snapshot_id and v.normalized_text is not null and length(btrim(v.normalized_text)) > 0
      and (d.kind not in ('OTHER', 'REVISION_REQUEST', 'APPLICANT_NOTE') or target_run.product in ('PRO', 'FINAL'))
  ), budgeted as (
    select visible.*, case when purpose = 'PRIMARY' then 0 else sum(case when purpose = 'PRIMARY' then 0 else length(text) end) over (order by priority, created_at rows between unbounded preceding and current row) end as spent from visible
  ) select jsonb_agg(jsonb_build_object('kind', case kind when 'COVER_LETTER' then 'cover_letter' when 'JOB_POSTING' then 'job_posting' when 'RESUME' then 'resume' when 'CAREER_DOCUMENT' then 'career_description' when 'PORTFOLIO' then 'portfolio' when 'REVISION_REQUEST' then 'revision_request' when 'CERTIFICATE' then 'certificate' when 'APPLICANT_NOTE' then 'applicant_note' when 'OTHER' then 'other' else 'portfolio' end, 'text', text, 'filename', original_filename) order by purpose, created_at) into request_documents from budgeted where purpose = 'PRIMARY' or spent <= reference_budget;
  return jsonb_build_object('analysisRunId', target_run.id, 'request', jsonb_build_object('requestId', target_run.application_case_id, 'product', target_run.product, 'writingMode', target_run.writing_mode, 'writingStyle', target_run.writing_style, 'editingStance', target_run.editing_stance, 'targetLength', target_run.target_length, 'documents', coalesce(request_documents, '[]'::jsonb)));
end;
$$;

commit;
