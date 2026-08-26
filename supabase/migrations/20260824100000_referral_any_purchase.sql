-- A referral no longer has to be someone's very first purchase.
--
-- The original function refused a code from anyone who had already paid, which
-- conflated two different rules:
--
--   * one account can be referred once, ever  — the real anti-abuse rule, and
--     it is the primary key on referral_attributions, not this check;
--   * the referred person must never have bought before — which protects
--     nothing and simply denies the referrer a reward they earned.
--
-- Someone who bought QUICK in March, is recommended the service by a friend in
-- August, and buys PRO on that friend's word is exactly the case a referral
-- programme exists for. Refusing it punished the referrer for the friend having
-- been a customer already.
--
-- Removing the check opens no loop. referred_user_id is still the primary key,
-- so one account is still referred at most once in its life, by one person. The
-- only new possibility is two friends each referring the other and each paying
-- real money for it, which is two sales.

begin;

/*
 * Records that this account arrived through someone's code.
 *
 * Pays nothing. That is the point.
 */
create or replace function public.apply_referral_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  referrer uuid;
  normalized text := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select owner_user_id into referrer from public.referral_codes where code = normalized;
  if referrer is null then
    raise exception 'REFERRAL_CODE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if referrer = current_user_id then
    raise exception 'REFERRAL_SELF' using errcode = '55000';
  end if;

  insert into public.referral_attributions (referred_user_id, referrer_user_id, code)
  values (current_user_id, referrer, normalized)
  on conflict (referred_user_id) do nothing;

  if not found then
    raise exception 'REFERRAL_ALREADY_USED' using errcode = '55000';
  end if;

  return jsonb_build_object('code', normalized, 'status', 'PENDING');
end;
$$;

revoke all on function public.apply_referral_code(text) from public;
grant execute on function public.apply_referral_code(text) to authenticated;

commit;
