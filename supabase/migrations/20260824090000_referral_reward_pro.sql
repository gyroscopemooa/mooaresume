-- The referral reward becomes PRO.
--
-- A referral costs the friend a real purchase, so a QUICK ticket was the
-- cheaper half of the trade. PRO is what the referrer would most likely have
-- bought anyway, and it is the tier where the product is worth talking about —
-- which is what a referral programme is trying to buy.
--
-- Same body as 20260824080000 with one word changed. Existing QUICK credits
-- already issued are left exactly as they are: they were granted under the
-- terms shown at the time.

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
    'PRO', 'REFERRAL', '친구 추천 보상 · 코드 ' || attribution.code,
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
