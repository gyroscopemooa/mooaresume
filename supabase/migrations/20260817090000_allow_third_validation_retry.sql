begin;

create or replace function public.prepare_quick_analysis_retry(
  p_analysis_run_id uuid,
  p_owner_user_id uuid
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
  for update;

  if target_run.id is null then
    raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_run.status <> 'FAILED'
     or target_run.failure_code <> 'AI_OUTPUT_VALIDATION_FAILED'
     or target_run.attempt_count >= 3 then
    raise exception 'ANALYSIS_RETRY_NOT_ALLOWED' using errcode = '55000';
  end if;
  if exists (select 1 from public.analysis_results where analysis_run_id = target_run.id) then
    raise exception 'ANALYSIS_RESULT_ALREADY_EXISTS' using errcode = '55000';
  end if;
  if not exists (
    select 1 from public.analysis_entitlements
    where application_case_id = target_run.application_case_id
      and owner_user_id = p_owner_user_id
      and product = 'QUICK' and status = 'ACTIVE'
  ) then
    raise exception 'ACTIVE_ENTITLEMENT_NOT_FOUND' using errcode = '42501';
  end if;

  update public.analysis_runs
  set status = 'PENDING', started_at = null, completed_at = null
  where id = target_run.id;
end;
$$;

revoke all on function public.prepare_quick_analysis_retry(uuid, uuid) from public;
grant execute on function public.prepare_quick_analysis_retry(uuid, uuid) to service_role;

commit;
