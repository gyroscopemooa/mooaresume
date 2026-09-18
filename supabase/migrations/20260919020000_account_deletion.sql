begin;

-- 계정 삭제 시에도 법령상 보관해야 하는 결제 기록만 따로 남기는 표입니다.
-- 사용자와 연결되는 열(이메일·user id·지원 건)은 일부러 두지 않았습니다.
-- 전자상거래법상 5년 보관 대상은 "무엇을 언제 얼마에 결제했는가"이고,
-- 구매자 식별은 결제사(Polar·Google Play)의 기록으로 이뤄집니다.
create table public.billing_records_retained (
  id uuid primary key default gen_random_uuid(),
  source_table text not null check (source_table in ('billing_orders', 'interview_retry_orders')),
  provider text not null,
  provider_order_id text not null,
  product text,
  amount integer not null check (amount >= 0),
  currency text not null check (char_length(currency) = 3),
  status text not null,
  paid_at timestamptz not null,
  refunded_at timestamptz,
  deleted_at timestamptz not null default timezone('utc', now()),
  retain_until timestamptz not null,
  unique (source_table, provider, provider_order_id)
);

create index billing_records_retained_retain_until_idx on public.billing_records_retained(retain_until);

alter table public.billing_records_retained enable row level security;
revoke all on public.billing_records_retained from anon, authenticated;

-- 계정 하나를 통째로 지웁니다. 한 트랜잭션이라 중간에 하나라도 실패하면
-- 아무것도 지워지지 않습니다(반쯤 지워진 계정이 남지 않음).
--
-- 순서가 중요한 이유: 아래 관계는 `on delete restrict`라서, 계정을 지울 때
-- 연쇄 삭제(cascade)에 맡기면 어느 표가 먼저 지워지느냐에 따라 실패할 수
-- 있습니다. 그래서 막는 쪽 표부터 직접 지운 뒤 마지막에 계정을 지웁니다.
--   reward_credits / analysis_entitlements -> billing_orders
--   billing_orders / analysis_entitlements -> application_cases
--   analysis_entitlements -> analysis_runs
--   analysis_runs -> submission_snapshots
--   submission_snapshot_items -> document_versions
create function public.delete_account_preserving_billing(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  retained_orders integer := 0;
  retained_retry_orders integer := 0;
begin
  if p_user_id is null then
    raise exception 'ACCOUNT_DELETION_USER_REQUIRED' using errcode = '22023';
  end if;

  insert into public.billing_records_retained (
    source_table, provider, provider_order_id, product, amount, currency, status, paid_at, refunded_at, retain_until
  )
  select 'billing_orders', bo.provider, bo.provider_order_id, bo.product, bo.amount, bo.currency,
         bo.status::text, bo.paid_at, bo.refunded_at, timezone('utc', now()) + interval '5 years'
  from public.billing_orders bo
  where bo.owner_user_id = p_user_id
  on conflict (source_table, provider, provider_order_id) do nothing;
  get diagnostics retained_orders = row_count;

  insert into public.billing_records_retained (
    source_table, provider, provider_order_id, product, amount, currency, status, paid_at, refunded_at, retain_until
  )
  select 'interview_retry_orders', ro.provider, ro.provider_order_id, null, ro.amount, ro.currency,
         ro.status::text, ro.paid_at, null, timezone('utc', now()) + interval '5 years'
  from public.interview_retry_orders ro
  where ro.owner_user_id = p_user_id
  on conflict (source_table, provider, provider_order_id) do nothing;
  get diagnostics retained_retry_orders = row_count;

  delete from public.reward_credits where owner_user_id = p_user_id;
  delete from public.analysis_entitlements where owner_user_id = p_user_id;
  delete from public.billing_orders where owner_user_id = p_user_id;
  delete from public.analysis_runs where owner_user_id = p_user_id;
  delete from public.submission_snapshots where owner_user_id = p_user_id;

  delete from auth.users where id = p_user_id;

  return jsonb_build_object(
    'retainedBillingOrders', retained_orders,
    'retainedInterviewRetryOrders', retained_retry_orders
  );
end;
$$;

revoke all on function public.delete_account_preserving_billing(uuid) from public, anon, authenticated;
grant execute on function public.delete_account_preserving_billing(uuid) to service_role;

commit;
