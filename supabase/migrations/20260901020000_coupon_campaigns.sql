-- 캠페인 한 개, 그 아래 쿠폰 코드 여러 개.
--
-- 앞선 마이그레이션(20260901010000)은 "코드 하나를 여러 사람이 나눠 쓰는" 모양을
-- 만들었습니다. 팜플렛에 찍어 배포할 때는 그 모양이 맞습니다.
--
-- 그런데 협업 기관에 코드 목록을 CSV로 넘기고 누가 어느 코드를 썼는지 보려면
-- **코드마다 한 사람**이어야 합니다. 코드 하나가 새어 나갔을 때 그 하나만
-- 막을 수 있는 것도 이쪽입니다.
--
-- 둘 중 하나를 고르지 않습니다. 쓰임이 다릅니다. 그래서 기존 coupon_codes를
-- 그대로 두고 `max_uses`를 붙입니다 — 1이면 고유 코드, 그보다 크면 공유 코드,
-- 계산은 이미 있는 claimed_count가 그대로 합니다.

begin;

create table if not exists public.coupon_campaigns (
  id uuid primary key default gen_random_uuid(),

  partner_name text not null check (char_length(partner_name) between 1 and 60),
  name text not null check (char_length(name) between 1 and 120),

  product text not null check (product in ('QUICK', 'PRO', 'FINAL')),

  -- 혜택 유형. 지금 지급 경로가 있는 것은 FREE_CREDIT 하나이고, 나머지 둘은
  -- 값을 받아 두되 지급은 아직 하지 않습니다. 스키마가 먼저 서 있어야 할인
  -- 캠페인을 만들 때 캠페인을 다시 만들지 않아도 됩니다.
  benefit_type text not null default 'FREE_CREDIT'
    check (benefit_type in ('FREE_CREDIT', 'FIXED_DISCOUNT', 'PERCENT_DISCOUNT')),
  -- 정액이면 원, 정률이면 퍼센트. 무료 이용권이면 null.
  benefit_amount integer check (benefit_amount is null or benefit_amount > 0),
  check (
    (benefit_type = 'FREE_CREDIT' and benefit_amount is null)
    or (benefit_type = 'FIXED_DISCOUNT' and benefit_amount is not null)
    or (benefit_type = 'PERCENT_DISCOUNT' and benefit_amount between 1 and 100)
  ),

  allowed_characters integer not null check (allowed_characters > 0),

  -- 한 사람이 이 캠페인에서 몇 장까지. 코드가 여러 장이어도 사람 기준으로 막습니다.
  per_user_limit integer not null default 1 check (per_user_limit between 1 and 100),

  starts_at timestamptz,
  expires_at timestamptz,
  check (starts_at is null or expires_at is null or starts_at < expires_at),

  description text check (description is null or char_length(description) <= 1000),
  notice text check (notice is null or char_length(notice) <= 1000),

  -- 팜플렛 문구. 캠페인이 이미지의 원본입니다.
  subtitle_text text not null default '이벤트·설문 참여자를 위한 특별 혜택',
  benefit_text text not null default 'QUICK 자소서 첨삭 1회 무료',
  audience_text text not null default '이벤트 참여자 및 선정자',
  usage_text text not null default 'mooaresume.com 접속 → 쿠폰 등록 → 첨삭 신청',
  footnote_text text not null default '1인 1회 사용 가능 / 타 쿠폰과 중복 사용 불가 / 이벤트 경품용',

  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

-- 기존 코드 테이블을 캠페인 아래로. 컬럼을 더하기만 합니다 — 이미 적용된
-- 마이그레이션이고, 그 안의 값과 제약은 그대로 살아 있어야 합니다.
alter table public.coupon_codes
  add column if not exists campaign_id uuid references public.coupon_campaigns(id) on delete cascade,
  add column if not exists max_uses integer not null default 1 check (max_uses between 1 and 100000);

-- 기존 행은 공유 코드였습니다. total_count를 그대로 한도로 옮겨 두어야
-- 앞서 배포한 코드가 갑자기 1회용이 되지 않습니다.
update public.coupon_codes set max_uses = total_count where campaign_id is null and max_uses = 1;

create index if not exists coupon_codes_campaign_idx on public.coupon_codes (campaign_id);

alter table public.coupon_campaigns enable row level security;
-- 정책을 주지 않습니다. 캠페인은 관리자(서비스 키)만 읽고 씁니다.

/*
 * 캠페인 아래 코드를 확인하고 등록합니다.
 *
 * 앞선 claim_coupon_code를 대체하지 않고 감쌉니다. 캠페인이 없는 코드(어제
 * 만들어 이미 배포한 것)는 예전과 똑같이 동작해야 합니다.
 *
 * 확인 순서에 뜻이 있습니다. 존재 → 회수 → 기간 → 수량 → 1인 제한. 각각 다른
 * 이름으로 실패해야 다음에 할 일을 알 수 있습니다.
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
  campaign public.coupon_campaigns%rowtype;
  effective_product text;
  effective_characters integer;
  effective_expires timestamptz;
  per_user integer := 1;
  used_by_user integer;
  new_credit_id uuid;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select * into coupon from public.coupon_codes
  where code = upper(trim(p_code))
  for update;

  if coupon.id is null then
    raise exception 'COUPON_NOT_FOUND' using errcode = 'P0002';
  end if;
  if coupon.revoked_at is not null then
    raise exception 'COUPON_REVOKED' using errcode = '55000';
  end if;

  effective_product := coupon.product;
  effective_characters := coupon.allowed_characters;
  effective_expires := coupon.expires_at;

  if coupon.campaign_id is not null then
    select * into campaign from public.coupon_campaigns
    where id = coupon.campaign_id
    for update;

    if campaign.id is null or campaign.archived_at is not null then
      raise exception 'COUPON_REVOKED' using errcode = '55000';
    end if;
    -- 할인 캠페인은 지급 경로가 아직 없습니다. 조용히 무료 이용권을 주느니
    -- 이름을 붙여 거절합니다.
    if campaign.benefit_type <> 'FREE_CREDIT' then
      raise exception 'COUPON_BENEFIT_UNSUPPORTED' using errcode = '55000';
    end if;

    effective_product := campaign.product;
    effective_characters := campaign.allowed_characters;
    effective_expires := coalesce(campaign.expires_at, coupon.expires_at);
    per_user := campaign.per_user_limit;

    if campaign.starts_at is not null and timezone('utc', now()) < campaign.starts_at then
      raise exception 'COUPON_NOT_STARTED' using errcode = '55000';
    end if;
    if campaign.expires_at is not null and timezone('utc', now()) > campaign.expires_at then
      raise exception 'COUPON_EXPIRED' using errcode = '55000';
    end if;

    -- 사람 기준 제한. 코드가 여러 장이라도 한 사람이 정해진 수를 넘지 못합니다.
    select count(*) into used_by_user
    from public.coupon_claims cc
    join public.coupon_codes cd on cd.id = cc.coupon_code_id
    where cd.campaign_id = campaign.id and cc.owner_user_id = current_user_id;

    if used_by_user >= per_user then
      raise exception 'COUPON_ALREADY_CLAIMED' using errcode = '55000';
    end if;
  end if;

  if coupon.starts_at is not null and timezone('utc', now()) < coupon.starts_at then
    raise exception 'COUPON_NOT_STARTED' using errcode = '55000';
  end if;
  if coupon.expires_at is not null and timezone('utc', now()) > coupon.expires_at then
    raise exception 'COUPON_EXPIRED' using errcode = '55000';
  end if;
  if coupon.claimed_count >= least(coupon.total_count, coupon.max_uses) then
    raise exception 'COUPON_EXHAUSTED' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.coupon_claims
    where coupon_code_id = coupon.id and owner_user_id = current_user_id
  ) then
    raise exception 'COUPON_ALREADY_CLAIMED' using errcode = '55000';
  end if;

  select email into current_email from auth.users where id = current_user_id;

  insert into public.reward_credits (
    product, reason, note, recipient_email, owner_user_id,
    claim_token, status, allowed_characters, claimed_at, expires_at
  ) values (
    effective_product,
    'MANUAL',
    left(coupon.partner_name || ' · ' || coupon.label, 500),
    coalesce(current_email, 'unknown@mooaresume.com'),
    current_user_id,
    encode(extensions.gen_random_bytes(24), 'hex'),
    'AVAILABLE',
    effective_characters,
    timezone('utc', now()),
    effective_expires
  )
  returning id into new_credit_id;

  insert into public.coupon_claims (coupon_code_id, owner_user_id, reward_credit_id)
  values (coupon.id, current_user_id, new_credit_id);

  update public.coupon_codes set claimed_count = claimed_count + 1 where id = coupon.id;

  return jsonb_build_object(
    'product', effective_product,
    'label', coupon.label,
    'partnerName', coupon.partner_name,
    'expiresAt', effective_expires
  );
end;
$$;

revoke all on function public.claim_coupon_code(text) from public;
grant execute on function public.claim_coupon_code(text) to authenticated;

commit;
