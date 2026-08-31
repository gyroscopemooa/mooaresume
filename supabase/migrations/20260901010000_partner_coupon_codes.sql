-- 협업 기관에 배포하는 공용 쿠폰 코드.
--
-- 지금까지의 무료 이용권은 "한 사람에게 한 장"이었습니다. 발급하려면 받는
-- 사람의 이메일을 미리 알아야 하고, 링크를 눌러야 받아집니다. 개별 지급(문의
-- 응대, 사과 보상)에는 그 모양이 맞습니다.
--
-- 협찬은 반대입니다. 청년재단이 설문 이벤트를 열고 당첨자에게 나눠 주는
-- 상황에서는, 발급하는 시점에 **누가 받을지 알 수 없습니다.** 필요한 것은
-- 팜플렛에 찍어 배포할 코드 하나와 "몇 장까지"입니다.
--
-- 그래서 기존 reward_credits는 손대지 않고, 그 앞에 코드 한 겹을 둡니다.
-- 코드를 등록하면 그 자리에서 reward_credits 한 줄이 만들어집니다 — 이후
-- 사용·소진·환불 경로는 지금까지와 완전히 같습니다.

begin;

create table if not exists public.coupon_codes (
  id uuid primary key default gen_random_uuid(),

  -- 사람이 읽고 받아 적는 코드. 팜플렛에 찍힙니다.
  -- 대문자로만 저장해 대소문자 때문에 "안 된다"는 문의가 생기지 않게 합니다.
  code text not null unique
    check (code = upper(code) and char_length(code) between 4 and 40),

  -- 관리자 화면과 팜플렛에 쓰는 이름들.
  label text not null check (char_length(label) between 1 and 120),
  partner_name text not null check (char_length(partner_name) between 1 and 60),

  product text not null check (product in ('QUICK', 'PRO', 'FINAL')),
  allowed_characters integer not null check (allowed_characters > 0),

  -- 몇 장까지. claimed_count는 등록될 때마다 함수가 올립니다.
  total_count integer not null check (total_count between 1 and 100000),
  claimed_count integer not null default 0 check (claimed_count >= 0),
  check (claimed_count <= total_count),

  starts_at timestamptz,
  expires_at timestamptz,
  check (starts_at is null or expires_at is null or starts_at < expires_at),

  -- 팜플렛 문구. 기본값을 두어 매번 새로 쓰지 않아도 되게 합니다.
  subtitle_text text not null default '이벤트·설문 참여자를 위한 특별 혜택',
  benefit_text text not null default 'QUICK 자소서 첨삭 1회 무료',
  audience_text text not null default '이벤트 참여자 및 선정자',
  usage_text text not null default 'mooaresume.com 접속 → 쿠폰 등록 → 첨삭 신청',
  footnote_text text not null default '1인 1회 사용 가능 / 타 쿠폰과 중복 사용 불가 / 이벤트 경품용',

  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

-- 한 사람이 같은 코드를 두 번 쓰지 못하게 합니다. 팜플렛의 "1인 1회"가
-- 문구가 아니라 규칙이 되는 자리입니다.
create table if not exists public.coupon_claims (
  coupon_code_id uuid not null references public.coupon_codes(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  reward_credit_id uuid not null references public.reward_credits(id) on delete cascade,
  claimed_at timestamptz not null default timezone('utc', now()),
  primary key (coupon_code_id, owner_user_id)
);

alter table public.coupon_codes enable row level security;
alter table public.coupon_claims enable row level security;

-- 코드 목록은 누구에게도 열지 않습니다. 열면 유효한 코드를 긁어갈 수 있습니다.
-- 등록은 아래 함수로만 이루어지고, 함수가 security definer입니다.
drop policy if exists "coupon claim owner read" on public.coupon_claims;
create policy "coupon claim owner read" on public.coupon_claims for select to authenticated
  using ((select auth.uid()) = owner_user_id);

/*
 * 쿠폰 코드를 등록해 이용권 한 장을 받습니다.
 *
 * 확인하는 것: 코드 존재, 회수 여부, 시작·만료 기간, 남은 수량, 그리고 이
 * 계정이 이미 쓴 적이 있는지. 하나라도 걸리면 **왜 안 되는지**를 각각 다른
 * 이름으로 돌려줍니다 — "사용할 수 없는 코드입니다" 하나로 뭉치면 기간이
 * 지난 것인지 수량이 찬 것인지 오탈자인지 아무도 알 수 없습니다.
 */
create or replace function public.claim_coupon_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text;
  coupon public.coupon_codes%rowtype;
  new_credit_id uuid;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  -- 대소문자와 앞뒤 공백은 사용자의 잘못이 아닙니다.
  select * into coupon from public.coupon_codes
  where code = upper(trim(p_code))
  for update;

  if coupon.id is null then
    raise exception 'COUPON_NOT_FOUND' using errcode = 'P0002';
  end if;
  if coupon.revoked_at is not null then
    raise exception 'COUPON_REVOKED' using errcode = '55000';
  end if;
  if coupon.starts_at is not null and timezone('utc', now()) < coupon.starts_at then
    raise exception 'COUPON_NOT_STARTED' using errcode = '55000';
  end if;
  if coupon.expires_at is not null and timezone('utc', now()) > coupon.expires_at then
    raise exception 'COUPON_EXPIRED' using errcode = '55000';
  end if;
  if coupon.claimed_count >= coupon.total_count then
    raise exception 'COUPON_EXHAUSTED' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.coupon_claims
    where coupon_code_id = coupon.id and owner_user_id = current_user_id
  ) then
    raise exception 'COUPON_ALREADY_CLAIMED' using errcode = '55000';
  end if;

  select email into current_email from auth.users where id = current_user_id;

  -- 기존 이용권 테이블에 그대로 한 줄. 이후 사용·소진 경로는 지금까지와
  -- 완전히 같습니다. recipient_email이 not null이라 계정 메일을 씁니다.
  insert into public.reward_credits (
    product, reason, note, recipient_email, owner_user_id,
    claim_token, status, allowed_characters, claimed_at, expires_at
  ) values (
    coupon.product,
    'MANUAL',
    left(coupon.partner_name || ' · ' || coupon.label, 500),
    coalesce(current_email, 'unknown@mooaresume.com'),
    current_user_id,
    encode(extensions.gen_random_bytes(24), 'hex'),
    'AVAILABLE',
    coupon.allowed_characters,
    timezone('utc', now()),
    coupon.expires_at
  )
  returning id into new_credit_id;

  insert into public.coupon_claims (coupon_code_id, owner_user_id, reward_credit_id)
  values (coupon.id, current_user_id, new_credit_id);

  update public.coupon_codes
  set claimed_count = claimed_count + 1
  where id = coupon.id;

  return jsonb_build_object(
    'product', coupon.product,
    'label', coupon.label,
    'partnerName', coupon.partner_name,
    'expiresAt', coupon.expires_at
  );
end;
$$;

revoke all on function public.claim_coupon_code(text) from public;
grant execute on function public.claim_coupon_code(text) to authenticated;

commit;
