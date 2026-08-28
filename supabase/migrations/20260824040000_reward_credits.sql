-- Free analyses granted as an account credit rather than a coupon code.
--
-- The coupon-code version of this is easy and wrong. A code that reaches the
-- applicant can be copied, posted, and used by people who never earned it, and
-- afterwards nobody can say who was given what or whether it was used. A credit
-- attached to an account answers all three questions and cannot be forwarded.
--
-- The mail that goes out therefore carries no number. It carries a one-time
-- link, and the person who opens it decides which account receives the credit.
-- That last part matters more than it looks: an event signup arrives from
-- abc@naver.com while the same person signs in with Google as abc@gmail.com,
-- and matching on the address alone would strand them. The link lets them
-- attach it to whichever account they actually use.
--
-- Referral attribution is deliberately not in this migration. A referral is one
-- of the reasons a credit gets issued, not a separate mechanism, and the
-- payout has nothing to land on until this exists.

begin;

-- A credit redeems into a real entitlement, and every entitlement points at a
-- billing order. Recording a free grant as a POLAR order would put a made-up
-- order id next to real ones; MOOA_CREDIT keeps the two tellable apart in every
-- later report.
alter table public.billing_orders drop constraint if exists billing_orders_provider_check;
alter table public.billing_orders
  add constraint billing_orders_provider_check check (provider in ('POLAR', 'MOOA_CREDIT'));

do $$ begin
  create type public.reward_credit_status as enum ('UNCLAIMED', 'AVAILABLE', 'CONSUMED', 'EXPIRED', 'REVOKED');
exception when duplicate_object then null;
end $$;

create table if not exists public.reward_credits (
  id uuid primary key default gen_random_uuid(),
  product text not null check (product in ('QUICK', 'PRO', 'FINAL')),
  -- Why it was given. Every future source — 친구 추천, SNS 인증, CS 보상,
  -- 런칭 이벤트 — is a value here rather than a table of its own.
  reason text not null check (reason in ('LAUNCH_EVENT', 'REFERRAL', 'SNS', 'CS', 'MANUAL')),
  note text check (note is null or char_length(note) <= 500),

  -- Who it was issued to, before anyone has signed in. Kept even after the
  -- credit is claimed so an operator can answer "did the address I mailed
  -- actually receive it".
  recipient_email text not null check (char_length(recipient_email) between 3 and 254),
  -- Set when the link is opened and the credit is attached to an account. May
  -- differ from recipient_email, on purpose.
  owner_user_id uuid references auth.users(id) on delete cascade,

  -- Single-use, unguessable, and the only thing that travels by mail.
  claim_token text not null unique check (char_length(claim_token) between 20 and 64),
  status public.reward_credit_status not null default 'UNCLAIMED',

  -- How much text the resulting entitlement covers. Mirrors the paid path's
  -- allowed_characters so a free run cannot quietly analyse more than a bought
  -- one.
  allowed_characters integer not null check (allowed_characters > 0),

  billing_order_id uuid unique references public.billing_orders(id) on delete restrict,
  claimed_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),

  -- The states are worth spelling out because every one of them is reachable
  -- and the differences matter to money: UNCLAIMED has no owner, AVAILABLE has
  -- an owner and nothing spent, CONSUMED has produced exactly one order.
  check (
    (status = 'UNCLAIMED' and owner_user_id is null and claimed_at is null and billing_order_id is null and consumed_at is null)
    or (status = 'AVAILABLE' and owner_user_id is not null and claimed_at is not null and billing_order_id is null and consumed_at is null)
    or (status = 'CONSUMED' and owner_user_id is not null and billing_order_id is not null and consumed_at is not null)
    or (status in ('EXPIRED', 'REVOKED') and billing_order_id is null and consumed_at is null)
  )
);

create index if not exists reward_credits_owner_idx on public.reward_credits(owner_user_id, status, created_at desc);
create index if not exists reward_credits_email_idx on public.reward_credits(recipient_email, created_at desc);

alter table public.reward_credits enable row level security;

-- Read-only, and only your own. Every state change goes through the two
-- functions below so the checks above cannot be sidestepped from a browser.
drop policy if exists "reward credit owner read" on public.reward_credits;
create policy "reward credit owner read" on public.reward_credits for select to authenticated
  using ((select auth.uid()) = owner_user_id);

/*
 * Attaches an unclaimed credit to whoever is signed in.
 *
 * Idempotent for the same account: opening the link twice is normal (mail
 * clients prefetch, people forward the tab to themselves) and must not read as
 * an error. Opening a credit someone else already claimed is a different
 * matter and is refused.
 */
create or replace function public.claim_reward_credit(p_claim_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  credit public.reward_credits%rowtype;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select * into credit from public.reward_credits
  where claim_token = p_claim_token
  for update;

  if credit.id is null then
    raise exception 'REWARD_CREDIT_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Expiry is checked here rather than by a job: a credit nobody opens costs
  -- nothing, and the only moment the date has to be right is this one.
  if credit.expires_at is not null and credit.expires_at <= timezone('utc', now()) then
    update public.reward_credits set status = 'EXPIRED' where id = credit.id and status = 'UNCLAIMED';
    raise exception 'REWARD_CREDIT_EXPIRED' using errcode = '55000';
  end if;

  if credit.status = 'UNCLAIMED' then
    update public.reward_credits
    set status = 'AVAILABLE', owner_user_id = current_user_id, claimed_at = timezone('utc', now())
    where id = credit.id;
  elsif credit.owner_user_id is distinct from current_user_id then
    raise exception 'REWARD_CREDIT_ALREADY_CLAIMED' using errcode = '55000';
  elsif credit.status not in ('AVAILABLE', 'CONSUMED') then
    raise exception 'REWARD_CREDIT_NOT_CLAIMABLE' using errcode = '55000';
  end if;

  return jsonb_build_object(
    'creditId', credit.id,
    'product', credit.product,
    'alreadyClaimed', credit.status <> 'UNCLAIMED',
    'consumed', credit.status = 'CONSUMED'
  );
end;
$$;

/*
 * Spends one credit on one application case.
 *
 * Produces the same two rows a paid run produces — a billing order and an
 * entitlement — because everything downstream (begin_quick_analysis, the cron
 * backstop, the refund paths) reads those and nothing else. A second issuance
 * shape would mean a second set of bugs.
 *
 * The zero-amount order is not a fiction: something was granted, it had a
 * reason, and it is worth 0원. Recording it keeps one honest ledger.
 */
create or replace function public.consume_reward_credit(p_application_case_id uuid, p_product text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  credit public.reward_credits%rowtype;
  case_owner_id uuid;
  order_id uuid;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;
  if p_product not in ('QUICK', 'PRO', 'FINAL') then
    raise exception 'INVALID_PRODUCT' using errcode = '22023';
  end if;

  select owner_user_id into case_owner_id
  from public.application_cases
  where id = p_application_case_id
  for update;

  if case_owner_id is null or case_owner_id <> current_user_id then
    raise exception 'APPLICATION_CASE_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Refuses rather than stacking. Two active entitlements on one case would
  -- let a single credit cover a second run for free.
  if exists (
    select 1 from public.analysis_entitlements ae
    where ae.application_case_id = p_application_case_id
      and ae.owner_user_id = current_user_id
      and ae.product = p_product and ae.status = 'ACTIVE'
  ) then
    raise exception 'ACTIVE_ENTITLEMENT_EXISTS' using errcode = '55000';
  end if;

  -- Oldest first so a credit that expires soonest is spent first, and
  -- `skip locked` so two tabs cannot spend the same one.
  select * into credit from public.reward_credits
  where owner_user_id = current_user_id
    and product = p_product
    and status = 'AVAILABLE'
    and (expires_at is null or expires_at > timezone('utc', now()))
  order by coalesce(expires_at, 'infinity'::timestamptz), created_at
  for update skip locked limit 1;

  if credit.id is null then
    raise exception 'REWARD_CREDIT_NOT_AVAILABLE' using errcode = '42501';
  end if;

  insert into public.billing_orders (
    provider, provider_order_id, application_case_id, owner_user_id,
    product, amount, currency, status, metadata, paid_at
  ) values (
    'MOOA_CREDIT', 'credit:' || credit.id::text, p_application_case_id, current_user_id,
    p_product, 0, 'krw', 'PAID',
    jsonb_build_object('rewardCreditId', credit.id, 'reason', credit.reason),
    timezone('utc', now())
  ) returning id into order_id;

  insert into public.analysis_entitlements (
    billing_order_id, application_case_id, owner_user_id, product, allowed_characters
  ) values (
    order_id, p_application_case_id, current_user_id, p_product, credit.allowed_characters
  );

  update public.reward_credits
  set status = 'CONSUMED', billing_order_id = order_id, consumed_at = timezone('utc', now())
  where id = credit.id;

  return jsonb_build_object('creditId', credit.id, 'billingOrderId', order_id, 'product', p_product);
end;
$$;

revoke all on function public.claim_reward_credit(text) from public;
grant execute on function public.claim_reward_credit(text) to authenticated;
revoke all on function public.consume_reward_credit(uuid, text) from public;
grant execute on function public.consume_reward_credit(uuid, text) to authenticated;

commit;
