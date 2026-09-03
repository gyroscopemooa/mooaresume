begin;

/*
 * 이용권 회수가 체크 제약에 걸리던 것을 고칩니다.
 *
 * `analysis_entitlements`에는 상태와 시각이 함께 맞아야 한다는 제약이 있습니다:
 *
 *     (status = 'REVOKED' and consumed_by_analysis_run_id is null
 *      and consumed_at is null and revoked_at is not null)
 *
 * 그런데 이 함수는 `status`만 바꾸고 `revoked_at`을 비워 둔 채로 두었습니다.
 * 그래서 환불이 실제로 접수된 뒤(폴라 환불 ID까지 받은 뒤) 회수 단계에서
 * `23514 check_violation`으로 넘어졌습니다.
 *
 * 다행히 그 실패는 환불을 되돌리지 않습니다 — 호출하는 쪽이 회수 실패를
 * 삼키고 "환불됨"으로 답하도록 만들어 두었기 때문입니다. 여기서 던졌다면
 * 바깥이 환불을 한 번 더 시도했을 것이고, 그게 훨씬 나쁩니다.
 *
 * 남는 문제는 손님이 **돈도 돌려받고 이용권도 그대로** 갖게 된다는 것입니다.
 * 그래서 고칩니다.
 */

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
  set status = 'REVOKED',
      -- 제약이 요구하는 나머지 절반입니다. 상태만 바꾸면 넘어집니다.
      revoked_at = timezone('utc', now()),
      -- ACTIVE였다면 이미 비어 있지만, 제약이 셋을 함께 보므로 명시합니다.
      consumed_by_analysis_run_id = null,
      consumed_at = null
  where billing_order_id = p_billing_order_id
    and owner_user_id = p_owner_user_id
    and status = 'ACTIVE';
  get diagnostics revoked_count = row_count;
  return revoked_count;
end;
$$;

revoke all on function public.revoke_refunded_analysis_entitlement(uuid, uuid) from public;
grant execute on function public.revoke_refunded_analysis_entitlement(uuid, uuid) to service_role;

commit;
