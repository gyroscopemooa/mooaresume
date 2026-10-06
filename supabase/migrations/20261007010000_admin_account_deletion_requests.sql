begin;

-- 운영자가 받은 삭제 요청의 처리 상태만 보관합니다. 메일 본문과 지원서 내용은
-- 저장하지 않으며, 완료 통지까지 성공하면 주소도 지워 최소한의 처리 증적만 남깁니다.
create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('ADMIN_EMAIL', 'EMAIL_WEBHOOK', 'SELF_SERVICE')),
  source_message_id text,
  requester_email text check (requester_email is null or char_length(requester_email) between 3 and 254),
  account_email text check (account_email is null or char_length(account_email) between 3 and 254),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'RECEIVED' check (status in ('RECEIVED', 'NEEDS_ACCOUNT_EMAIL', 'READY', 'PROCESSING', 'COMPLETED', 'FAILED')),
  notice_status text not null default 'PENDING' check (notice_status in ('PENDING', 'SENT', 'FAILED', 'NOT_APPLICABLE')),
  notice_provider_id text,
  error_code text,
  delete_attempts integer not null default 0 check (delete_attempts >= 0),
  requested_at timestamptz not null default timezone('utc', now()),
  processing_started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index account_deletion_requests_source_message_idx
  on public.account_deletion_requests(source_message_id)
  where source_message_id is not null;
create index account_deletion_requests_queue_idx
  on public.account_deletion_requests(status, requested_at desc);

alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from public, anon, authenticated;
grant all on public.account_deletion_requests to service_role;

-- 2026-09-19 함수 뒤에 이메일만 들고 있는 운영 표와 LIVE-SUB 지급표가 추가됐습니다.
-- Auth 행만 지우면 그 표의 연락처가 남으므로, 현재 스키마 기준으로 함께 정리합니다.
create or replace function public.delete_account_preserving_billing(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  retained_orders integer := 0;
  retained_retry_orders integer := 0;
  target_email text;
begin
  if p_user_id is null then
    raise exception 'ACCOUNT_DELETION_USER_REQUIRED' using errcode = '22023';
  end if;

  select email into target_email from auth.users where id = p_user_id;
  if target_email is null then
    raise exception 'ACCOUNT_DELETION_USER_NOT_FOUND' using errcode = 'P0002';
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

  -- 지급 사실은 운영상 남기되 연락처와 계정 연결은 복구할 수 없는 값으로 바꿉니다.
  update public.livesub_reward_grants
  set contact = 'deleted+' || left(md5(submission_id), 12) || '@invalid.local'
  where user_id = p_user_id;

  -- Auth 외부에서 이메일만 보관하던 선택 신청·문의·발송 기록도 함께 제거합니다.
  delete from public.waitlist_signups where lower(email) = lower(target_email);
  delete from public.contact_inquiries where lower(email) = lower(target_email);
  delete from public.mail_send_log
    where lower(recipient) = lower(target_email)
       or lower(coalesce(reply_to, '')) = lower(target_email);

  delete from public.reward_credits
    where owner_user_id = p_user_id or lower(recipient_email) = lower(target_email);
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
