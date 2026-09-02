begin;

-- 더 시도할 것이 없는 실패에도 자동 환불을 겁니다.
--
-- 10분을 넘긴 분석은 이미 자동으로 환불하고 있었는데, 아예 실패한 분석은
-- 이용권만 되살리고 돈은 그대로 두었습니다. 손님 입장에서는 뒤쪽이 더 나쁩니다
-- — 10분을 넘긴 건 아직 결과가 나올 수도 있지만, 최종 실패는 나오지 않습니다.
--
-- 기존 타임아웃 함수는 건드리지 않습니다. 검증된 경로이고, 두 경로는
-- `billing_orders.auto_refund_state`를 함께 보므로 한쪽이 환불한 주문을
-- 다른 쪽이 다시 환불하지 않습니다.

create or replace function public.claim_quick_analysis_failure_refund(
  p_analysis_run_id uuid,
  p_owner_user_id uuid
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
  select * into target_run from public.analysis_runs
  where id = p_analysis_run_id and owner_user_id = p_owner_user_id
  for update;
  if target_run.id is null then
    raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- 결과가 있으면 환불할 일이 아닙니다. 실패로 기록되었더라도 손님은 받을
  -- 것을 받았습니다.
  select exists (
    select 1 from public.analysis_results
    where analysis_run_id = target_run.id and owner_user_id = p_owner_user_id
  ) into result_exists;
  if target_run.status = 'COMPLETED' or result_exists then
    return jsonb_build_object('disposition', 'COMPLETED');
  end if;

  -- 재시도가 남아 있으면 `fail_quick_analysis`가 상태를 PENDING으로 되돌려
  -- 둡니다. FAILED로 남아 있다는 것이 곧 "여기서 끝"이라는 뜻입니다.
  if target_run.status <> 'FAILED' then
    return jsonb_build_object('disposition', 'RETRYABLE');
  end if;

  select bo.* into target_order
  from public.billing_orders bo
  join public.analysis_entitlements ae on ae.billing_order_id = bo.id
  where ae.owner_user_id = p_owner_user_id
    and ae.application_case_id = target_run.application_case_id
    and bo.status = 'PAID'
  order by bo.created_at desc limit 1
  for update of bo;

  -- 무료 이용권으로 돌린 분석에는 돌려줄 결제가 없습니다.
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

-- 환불된 결제에 딸린 이용권을 회수합니다.
--
-- 실패하면 `fail_quick_analysis`가 이용권을 ACTIVE로 되살립니다. 다시 돌려
-- 보라는 뜻이었는데, 돈까지 돌려주고 나면 그 이용권은 공짜 한 판이 됩니다.
-- 둘 중 하나만 드리는 것이 맞습니다 — 환불했으면 이용권은 거둡니다.
--
-- **환불이 실제로 접수된 뒤에만** 부릅니다. 먼저 거두고 환불에 실패하면
-- 손님에게는 돈도 이용권도 남지 않습니다.
--
-- 이미 쓴(CONSUMED) 이용권은 건드리지 않습니다. 그건 결과를 받은 다른 분석의
-- 것이고, 여기서 거두면 남의 판을 무르는 셈입니다.
create or replace function public.revoke_refunded_analysis_entitlement(
  p_billing_order_id uuid,
  p_owner_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  revoked_count integer;
begin
  update public.analysis_entitlements
  set status = 'REVOKED'
  where billing_order_id = p_billing_order_id
    and owner_user_id = p_owner_user_id
    and status = 'ACTIVE';
  get diagnostics revoked_count = row_count;
  return revoked_count;
end;
$$;

revoke all on function public.claim_quick_analysis_failure_refund(uuid, uuid) from public;
revoke all on function public.revoke_refunded_analysis_entitlement(uuid, uuid) from public;
grant execute on function public.claim_quick_analysis_failure_refund(uuid, uuid) to service_role;
grant execute on function public.revoke_refunded_analysis_entitlement(uuid, uuid) to service_role;

commit;
