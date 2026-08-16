begin;

create function public.prepare_quick_checkout(p_analysis_run_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_run public.analysis_runs%rowtype;
  total_characters integer;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select * into target_run
  from public.analysis_runs
  where id = p_analysis_run_id
    and owner_user_id = current_user_id;

  if target_run.id is null then
    raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode = 'P0002';
  end if;

  if target_run.product <> 'QUICK' or target_run.status <> 'PENDING' then
    raise exception 'CHECKOUT_NOT_ALLOWED' using errcode = '55000';
  end if;

  if exists (
    select 1 from public.analysis_entitlements ae
    where ae.application_case_id = target_run.application_case_id
      and ae.owner_user_id = current_user_id
      and ae.product = 'QUICK'
      and ae.status = 'ACTIVE'
  ) then
    raise exception 'ACTIVE_ENTITLEMENT_EXISTS' using errcode = '55000';
  end if;

  select coalesce(sum(v.character_count), 0)::integer into total_characters
  from public.submission_snapshot_items si
  join public.document_versions v on v.id = si.document_version_id
  where si.snapshot_id = target_run.submission_snapshot_id
    and si.purpose = 'PRIMARY';

  if total_characters <= 0 then
    raise exception 'PRIMARY_DOCUMENT_REQUIRED' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'analysisRunId', target_run.id,
    'applicationCaseId', target_run.application_case_id,
    'totalCharacters', total_characters
  );
end;
$$;

revoke all on function public.prepare_quick_checkout(uuid) from public;
grant execute on function public.prepare_quick_checkout(uuid) to authenticated;

commit;
