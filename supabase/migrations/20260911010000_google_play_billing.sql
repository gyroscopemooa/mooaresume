-- Adds Google Play Billing as a second payment provider, alongside Polar.
--
-- Web checkout keeps using Polar untouched. This is only for purchases made
-- inside the Play Store TWA wrapper, where Play policy requires Google Play
-- Billing for a digital product sold in-app. Follows the precedent set by
-- 20260824040000_reward_credits.sql, which widened billing_orders.provider to
-- add 'MOOA_CREDIT' for free credits rather than touching the Polar-specific
-- grant function in place — same idea here: a new 'GOOGLE_PLAY' value and a
-- new sibling grant function, grant_polar_order_entitlement is not modified.
--
-- Google Play purchases have no server-created "checkout session" the way
-- Polar does — the client completes the purchase first (Digital Goods API +
-- Payment Request API inside the TWA) and then the server verifies the
-- resulting purchase token. So there is no Google Play equivalent of
-- checkout_intents here; that table stays Polar-only (provider = 'POLAR').

begin;

alter table public.billing_orders drop constraint if exists billing_orders_provider_check;
alter table public.billing_orders
  add constraint billing_orders_provider_check check (provider in ('POLAR', 'MOOA_CREDIT', 'GOOGLE_PLAY'));

alter table public.billing_webhook_events drop constraint if exists billing_webhook_events_provider_check;
alter table public.billing_webhook_events
  add constraint billing_webhook_events_provider_check check (provider in ('POLAR', 'GOOGLE_PLAY'));

/*
 * Grants an entitlement for a Google Play purchase already verified against
 * the Play Developer API (purchases.products.get) by the caller.
 *
 * p_event_id/p_payload_sha256 dedup the same way Polar's webhook does, but
 * there is no webhook-id header here — the caller (the verify route) passes
 * the purchase token itself as the dedup key, since a purchase token is
 * unique per purchase and a retried client call would carry the same one.
 */
create or replace function public.grant_google_play_order_entitlement(
  p_event_id text,
  p_payload_sha256 text,
  p_provider_order_id text,
  p_application_case_id uuid,
  p_product text,
  p_allowed_characters integer,
  p_amount integer,
  p_currency text,
  p_paid_at timestamptz,
  p_metadata jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  case_owner_id uuid;
  order_id uuid;
begin
  if p_product not in ('QUICK', 'PRO', 'FINAL') or p_allowed_characters <= 0 or p_amount < 0 then
    raise exception 'INVALID_ENTITLEMENT_INPUT' using errcode = '22023';
  end if;

  insert into public.billing_webhook_events (
    provider, provider_event_id, event_type, payload_sha256
  ) values (
    'GOOGLE_PLAY', p_event_id, 'purchase.verified', p_payload_sha256
  ) on conflict (provider, provider_event_id) do nothing;

  if not found then
    return 'DUPLICATE_EVENT';
  end if;

  select owner_user_id into case_owner_id
  from public.application_cases
  where id = p_application_case_id
  for update;

  if case_owner_id is null then
    raise exception 'APPLICATION_CASE_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.billing_orders (
    provider, provider_order_id, application_case_id,
    owner_user_id, product, amount, currency, status, metadata, paid_at
  ) values (
    'GOOGLE_PLAY', p_provider_order_id,
    p_application_case_id, case_owner_id, p_product, p_amount, lower(p_currency),
    'PAID', p_metadata, p_paid_at
  ) on conflict (provider, provider_order_id) do nothing
  returning id into order_id;

  if order_id is null then
    return 'DUPLICATE_ORDER';
  end if;

  insert into public.analysis_entitlements (
    billing_order_id, application_case_id, owner_user_id, product, allowed_characters
  ) values (
    order_id, p_application_case_id, case_owner_id, p_product, p_allowed_characters
  );

  return 'GRANTED';
end;
$$;

revoke all on function public.grant_google_play_order_entitlement(text, text, text, uuid, text, integer, integer, text, timestamptz, jsonb) from public;
grant execute on function public.grant_google_play_order_entitlement(text, text, text, uuid, text, integer, integer, text, timestamptz, jsonb) to service_role;

-- Same body as 20260824110000, with the purchase gate widened so a Google
-- Play order can also convert a pending referral. Without this, a friend who
-- pays through the Play app would never settle the referrer's reward — the
-- old gate only recognised 'POLAR'.
create or replace function public.settle_referral_for_order(p_billing_order_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  paid_order public.billing_orders%rowtype;
  attribution public.referral_attributions%rowtype;
  credit_id uuid;
  referrer_email text;
begin
  select * into paid_order from public.billing_orders where id = p_billing_order_id;
  if paid_order.id is null or paid_order.status <> 'PAID' then
    return 'NO_PAID_ORDER';
  end if;
  -- A free run is not a referral conversion. Paying nothing and handing the
  -- referrer a ticket is the same loophole in a different coat.
  if paid_order.amount <= 0 or paid_order.provider not in ('POLAR', 'GOOGLE_PLAY') then
    return 'NOT_A_PURCHASE';
  end if;

  select * into attribution from public.referral_attributions
  where referred_user_id = paid_order.owner_user_id and status = 'PENDING'
  for update;

  if attribution.referred_user_id is null then
    return 'NO_PENDING_REFERRAL';
  end if;

  select email into referrer_email from auth.users where id = attribution.referrer_user_id;

  insert into public.reward_credits (
    product, reason, note, recipient_email, owner_user_id, claim_token,
    status, allowed_characters, claimed_at
  ) values (
    paid_order.product, 'REFERRAL',
    '친구 추천 보상 · ' || paid_order.product || ' · 코드 ' || attribution.code,
    coalesce(referrer_email, 'unknown@mooaresume.com'), attribution.referrer_user_id,
    translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_'),
    'AVAILABLE', 20000, timezone('utc', now())
  ) returning id into credit_id;

  update public.referral_attributions
  set status = 'CONVERTED',
      billing_order_id = p_billing_order_id,
      reward_credit_id = credit_id,
      converted_at = timezone('utc', now())
  where referred_user_id = attribution.referred_user_id;

  return 'CONVERTED';
end;
$$;

revoke all on function public.settle_referral_for_order(uuid) from public;
grant execute on function public.settle_referral_for_order(uuid) to service_role;

commit;
