begin;

alter table public.billing_orders
  add column if not exists auto_refund_state text
    check (auto_refund_state is null or auto_refund_state in ('SUBMITTING', 'SUBMITTED', 'UNCERTAIN')),
  add column if not exists auto_refund_requested_at timestamptz,
  add column if not exists auto_refund_provider_id text;

create or replace function public.claim_quick_analysis_timeout_refund(
  p_analysis_run_id uuid,
  p_owner_user_id uuid,
  p_timeout_seconds integer default 600
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_run public.analysis_runs%rowtype;
  target_order public.billing_orders%rowtype;
  result_exists boolean;
begin
  if p_timeout_seconds < 60 then
    raise exception 'INVALID_TIMEOUT' using errcode = '22023';
  end if;

  select * into target_run from public.analysis_runs
  where id = p_analysis_run_id and owner_user_id = p_owner_user_id
  for update;
  if target_run.id is null then
    raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode = 'P0002';
  end if;

  select exists (
    select 1 from public.analysis_results
    where analysis_run_id = target_run.id and owner_user_id = p_owner_user_id
  ) into result_exists;

  if target_run.status = 'COMPLETED' or result_exists then
    return jsonb_build_object('disposition', 'COMPLETED');
  end if;

  if target_run.status = 'RUNNING'
     and target_run.started_at > timezone('utc', now()) - make_interval(secs => p_timeout_seconds) then
    return jsonb_build_object('disposition', 'RUNNING');
  end if;

  if target_run.status = 'RUNNING' then
    update public.analysis_runs
    set status = 'FAILED', failure_code = 'ANALYSIS_TIMEOUT', completed_at = timezone('utc', now())
    where id = target_run.id;

    update public.analysis_entitlements
    set status = 'ACTIVE', consumed_by_analysis_run_id = null, consumed_at = null
    where owner_user_id = p_owner_user_id
      and consumed_by_analysis_run_id = target_run.id and status = 'CONSUMED';
  elsif not (target_run.status = 'FAILED' and target_run.failure_code = 'ANALYSIS_TIMEOUT') then
    return jsonb_build_object('disposition', 'NOOP');
  end if;

  select bo.* into target_order
  from public.billing_orders bo
  join public.analysis_entitlements ae on ae.billing_order_id = bo.id
  where ae.owner_user_id = p_owner_user_id
    and ae.application_case_id = target_run.application_case_id
    and bo.status = 'PAID'
  order by bo.created_at desc limit 1
  for update of bo;

  if target_order.id is null then
    return jsonb_build_object('disposition', 'FAILED_WITHOUT_ORDER');
  end if;
  if target_order.auto_refund_state = 'SUBMITTED' then
    return jsonb_build_object('disposition', 'REFUND_SUBMITTED');
  end if;
  if target_order.auto_refund_state in ('SUBMITTING', 'UNCERTAIN') then
    return jsonb_build_object('disposition', 'REFUND_IN_PROGRESS');
  end if;

  update public.billing_orders set auto_refund_state = 'SUBMITTING'
  where id = target_order.id;

  return jsonb_build_object(
    'disposition', 'REFUND_REQUIRED',
    'billingOrderId', target_order.id,
    'providerOrderId', target_order.provider_order_id,
    'amount', target_order.amount,
    'currency', target_order.currency
  );
end;
$$;

create or replace function public.mark_quick_auto_refund_submitted(
  p_billing_order_id uuid,
  p_provider_refund_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.billing_orders
  set auto_refund_state = 'SUBMITTED', auto_refund_requested_at = timezone('utc', now()),
      auto_refund_provider_id = left(p_provider_refund_id, 255)
  where id = p_billing_order_id and auto_refund_state = 'SUBMITTING';
  if not found then
    raise exception 'REFUND_ORDER_NOT_MARKABLE' using errcode = '55000';
  end if;
end;
$$;

create or replace function public.mark_quick_auto_refund_uncertain(p_billing_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.billing_orders set auto_refund_state = 'UNCERTAIN'
  where id = p_billing_order_id and auto_refund_state = 'SUBMITTING';
end;
$$;

revoke all on function public.claim_quick_analysis_timeout_refund(uuid, uuid, integer) from public;
revoke all on function public.mark_quick_auto_refund_submitted(uuid, text) from public;
revoke all on function public.mark_quick_auto_refund_uncertain(uuid) from public;
grant execute on function public.claim_quick_analysis_timeout_refund(uuid, uuid, integer) to service_role;
grant execute on function public.mark_quick_auto_refund_submitted(uuid, text) to service_role;
grant execute on function public.mark_quick_auto_refund_uncertain(uuid) to service_role;

commit;