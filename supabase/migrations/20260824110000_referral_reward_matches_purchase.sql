-- The referral reward matches what the friend bought.
--
-- A flat PRO reward meant a 5,900 QUICK purchase paid out 12,900 of value. The
-- cash never went negative — a credit costs an API call, not its sticker price
-- — but the incentive pointed the wrong way: once anyone noticed, the advice to
-- a friend becomes "just buy the cheapest one so I get PRO".
--
-- Same tier as the purchase is also the easiest sentence to put on the page:
-- 친구가 산 것과 같은 이용권을 드립니다.
--
-- Same body as 20260824090000 with the product taken from the order.

begin;

/*
 * Settles a pending referral against a real paid order.
 *
 * Called from the paid-order path, never from a browser. Returns a word rather
 * than raising, because a referral problem must not roll back a payment that
 * already happened.
 */
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
  token text;
  referrer_email text;
begin
  select * into paid_order from public.billing_orders where id = p_billing_order_id;
  if paid_order.id is null or paid_order.status <> 'PAID' then
    return 'NO_PAID_ORDER';
  end if;
  -- A free run is not a referral conversion. Paying nothing and handing the
  -- referrer a ticket is the same loophole in a different coat.
  if paid_order.amount <= 0 or paid_order.provider <> 'POLAR' then
    return 'NOT_A_PURCHASE';
  end if;

  select * into attribution from public.referral_attributions
  where referred_user_id = paid_order.owner_user_id and status = 'PENDING'
  for update;

  if attribution.referred_user_id is null then
    return 'NO_PENDING_REFERRAL';
  end if;

  select email into referrer_email from auth.users where id = attribution.referrer_user_id;

  -- The referrer's credit arrives already claimed: they have an account, so
  -- there is nobody to send a claim link to. The token is still generated
  -- because the column requires one and a real value keeps the table uniform.
  insert into public.reward_credits (
    product, reason, note, recipient_email, owner_user_id, claim_token,
    status, allowed_characters, claimed_at
  ) values (
    -- The tier the friend actually bought, not a fixed one. A flat PRO reward
    -- paid 12,900 of value for a 5,900 purchase, which quietly tells everyone to
    -- recommend the cheapest product.
    paid_order.product, 'REFERRAL',
    '친구 추천 보상 · ' || paid_order.product || ' · 코드 ' || attribution.code,
    coalesce(referrer_email, 'unknown@mooaresume.com'), attribution.referrer_user_id,
    -- base64url: the column is shared with mailed credits whose token
    -- travels in a URL path, so + / = have no business in it.
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
