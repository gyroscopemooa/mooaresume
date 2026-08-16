begin;

create function public.get_quick_checkout_return(p_provider_checkout_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  intent public.checkout_intents%rowtype;
  run_status public.analysis_run_status;
  entitlement_status_value public.entitlement_status;
  has_result boolean;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select * into intent from public.checkout_intents
  where provider = 'POLAR'
    and provider_checkout_id = p_provider_checkout_id
    and owner_user_id = current_user_id;

  if intent.id is null then
    raise exception 'CHECKOUT_INTENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select ar.status into run_status
  from public.analysis_runs ar
  where ar.id = intent.analysis_run_id and ar.owner_user_id = current_user_id;

  select ae.status into entitlement_status_value
  from public.billing_orders bo
  join public.analysis_entitlements ae on ae.billing_order_id = bo.id
  where bo.provider = 'POLAR'
    and bo.provider_checkout_id = p_provider_checkout_id
    and bo.owner_user_id = current_user_id
  order by ae.created_at desc limit 1;

  select exists (
    select 1 from public.analysis_results r
    where r.analysis_run_id = intent.analysis_run_id
      and r.owner_user_id = current_user_id
  ) into has_result;

  return jsonb_build_object(
    'checkoutId', intent.provider_checkout_id,
    'checkoutStatus', intent.status,
    'analysisRunId', intent.analysis_run_id,
    'analysisStatus', run_status,
    'entitlementStatus', entitlement_status_value,
    'hasResult', has_result
  );
end;
$$;

revoke all on function public.get_quick_checkout_return(text) from public;
grant execute on function public.get_quick_checkout_return(text) to authenticated;

commit;
