-- Friend referral, settled on payment.
--
-- The whole design turns on one line: entering a code records an intention and
-- nothing else. The credit is issued from the paid-order path, where money has
-- actually moved. Reward on entry and the first person to notice writes a loop
-- that types their own code on a hundred throwaway accounts; reward on
-- order.paid and the attack costs more than the prize.
--
-- Three more things the shape has to enforce, because a screen cannot:
--   * a code cannot be used by the account that owns it,
--   * one referred account counts once, ever,
--   * and only their first purchase counts.

begin;

create table if not exists public.referral_codes (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^MOOA[A-Z2-9]{6}$'),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.referral_attributions (
  -- One row per referred account, forever. The primary key is the rule.
  referred_user_id uuid primary key references auth.users(id) on delete cascade,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'CONVERTED', 'REJECTED')),
  -- The order that settled it. Null while pending; set once and never again.
  billing_order_id uuid unique references public.billing_orders(id) on delete set null,
  -- The credit handed to the referrer. Also the guard against paying twice:
  -- unique, so a repeated webhook cannot mint a second one.
  reward_credit_id uuid unique references public.reward_credits(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  converted_at timestamptz,
  check (referred_user_id <> referrer_user_id),
  check (
    (status = 'PENDING' and converted_at is null and reward_credit_id is null)
    or (status = 'CONVERTED' and converted_at is not null)
    or (status = 'REJECTED')
  )
);

create index if not exists referral_attributions_referrer_idx on public.referral_attributions(referrer_user_id, status, created_at desc);

alter table public.referral_codes enable row level security;
alter table public.referral_attributions enable row level security;

-- Your own code, and the referrals you made. Never anyone else's, and never
-- the reverse direction: who referred *you* is not something the referrer gets
-- to browse.
drop policy if exists "referral code owner read" on public.referral_codes;
create policy "referral code owner read" on public.referral_codes for select to authenticated
  using ((select auth.uid()) = owner_user_id);
drop policy if exists "referral attribution referrer read" on public.referral_attributions;
create policy "referral attribution referrer read" on public.referral_attributions for select to authenticated
  using ((select auth.uid()) = referrer_user_id);

/*
 * Returns this account's code, creating it on first ask.
 *
 * Generated in SQL rather than handed in by the browser: a client-supplied code
 * is a client-chosen code, and someone would pick their friend's.
 */
create or replace function public.get_or_create_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  existing text;
  candidate text;
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select code into existing from public.referral_codes where owner_user_id = current_user_id;
  if existing is not null then
    return existing;
  end if;

  -- Retried rather than assumed unique. The space is 31^6 (~887M) so a
  -- collision is rare, and rare is exactly the kind of failure that shows up
  -- once in production and nowhere in testing.
  for attempt in 1..10 loop
    candidate := 'MOOA';
    for position in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;
    begin
      insert into public.referral_codes (owner_user_id, code) values (current_user_id, candidate);
      return candidate;
    exception when unique_violation then
      -- Someone else holds this code, or this account got one in a parallel
      -- request. Re-read before trying again.
      select code into existing from public.referral_codes where owner_user_id = current_user_id;
      if existing is not null then
        return existing;
      end if;
    end;
  end loop;

  raise exception 'REFERRAL_CODE_GENERATION_FAILED' using errcode = '55000';
end;
$$;

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

  -- Only a first purchase counts, and this is where that is checked — before
  -- an intention is recorded that could never be honoured.
  if exists (select 1 from public.billing_orders where owner_user_id = current_user_id and status = 'PAID') then
    raise exception 'REFERRAL_NOT_FIRST_PURCHASE' using errcode = '55000';
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
    'QUICK', 'REFERRAL', '친구 추천 보상 · 코드 ' || attribution.code,
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

revoke all on function public.get_or_create_referral_code() from public;
grant execute on function public.get_or_create_referral_code() to authenticated;
revoke all on function public.apply_referral_code(text) from public;
grant execute on function public.apply_referral_code(text) to authenticated;
revoke all on function public.settle_referral_for_order(uuid) from public;
grant execute on function public.settle_referral_for_order(uuid) to service_role;

commit;
