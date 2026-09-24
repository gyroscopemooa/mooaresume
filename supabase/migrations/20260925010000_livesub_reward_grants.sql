-- LIVE-SUB HQ 이벤트 승인 → 혜택 자동 지급.
--
-- HQ 운영자가 참가 증빙을 보고 "승인"을 누르면 HQ 서버가 무아레쥬메의
-- grant-reward 엔드포인트를 호출하고, 엔드포인트는 이 함수 하나만 부른다.
-- 새 지급 방식을 만들지 않는다: 친구 추천·결과 보고 보상과 같은
-- public.reward_credits 표에 "이미 내 계정에 붙은 이용권"을 한 장 넣을 뿐이다.
-- 그러면 사용 시점(consume_reward_credit)·환불·원장 처리는 전부 기존 경로가 한다.
--
-- 같은 승인이 두 번 도착하는 것(HQ 재시도, 네트워크 재전송)은 정상이다.
-- submission_id 를 기본키로 저장해 두 번째부터는 아무것도 지급하지 않는다.

begin;

create table if not exists public.livesub_reward_grants (
  submission_id text primary key check (char_length(submission_id) between 1 and 200),
  campaign_id text not null check (char_length(campaign_id) between 1 and 200),
  environment text not null check (environment in ('development', 'staging', 'production')),
  contact text not null check (char_length(contact) between 3 and 254),
  reward_code text not null check (reward_code in ('QUICK', 'PRO')),
  -- 누구에게 무엇이 갔는지 운영자가 되짚을 수 있도록 남긴다.
  user_id uuid references auth.users(id) on delete set null,
  reward_credit_id uuid unique references public.reward_credits(id) on delete set null,
  granted_at timestamptz not null default timezone('utc', now())
);

create index if not exists livesub_reward_grants_contact_idx
  on public.livesub_reward_grants(contact, granted_at desc);

-- 정책을 하나도 만들지 않는다. 서비스 키(서버)만 읽고 쓴다.
alter table public.livesub_reward_grants enable row level security;
revoke all on public.livesub_reward_grants from anon, authenticated;

/*
 * 승인된 신청 1건에 이용권 1장을 지급한다.
 *
 * 결과를 예외가 아니라 단어로 돌려준다:
 *   GRANTED   이번에 지급함
 *   DUPLICATE 이미 처리된 신청 — 다시 지급하지 않음 (HQ에는 성공으로 보인다)
 *   NO_USER   그 이메일의 가입자가 없음 — 아무것도 저장하지 않음
 *
 * 가입자 조회가 멱등성 기록보다 먼저인 이유: 가입자가 없어서 거절된 신청을
 * "처리됨"으로 남기면, 그 사람이 나중에 가입한 뒤 HQ에서 다시 승인해도
 * DUPLICATE 로 막혀 영영 못 받는다.
 */
create or replace function public.grant_livesub_reward(
  p_submission_id text,
  p_campaign_id text,
  p_environment text,
  p_contact text,
  p_reward_code text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_contact text := lower(btrim(p_contact));
  target_user_id uuid;
  target_email text;
  inserted_count integer;
  credit_id uuid;
begin
  if p_reward_code not in ('QUICK', 'PRO') then
    raise exception 'INVALID_REWARD_CODE' using errcode = '22023';
  end if;

  if exists (select 1 from public.livesub_reward_grants where submission_id = p_submission_id) then
    return 'DUPLICATE';
  end if;

  select id, email into target_user_id, target_email
  from auth.users
  where lower(email) = normalized_contact
  order by created_at
  limit 1;

  if target_user_id is null then
    return 'NO_USER';
  end if;

  -- 동시에 같은 신청이 두 번 들어오면 한쪽은 여기서 기다렸다가 0행이 되어
  -- DUPLICATE 로 빠진다. 기본키가 두 번째 잠금이다.
  insert into public.livesub_reward_grants (
    submission_id, campaign_id, environment, contact, reward_code, user_id
  ) values (
    p_submission_id, p_campaign_id, p_environment, normalized_contact, p_reward_code, target_user_id
  )
  on conflict (submission_id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    return 'DUPLICATE';
  end if;

  -- 이미 계정에 붙은 채(AVAILABLE)로 들어간다. 메일로 보낼 링크가 없으므로
  -- 토큰은 표의 형식만 맞추는 값이다.
  insert into public.reward_credits (
    product, reason, note, recipient_email, owner_user_id, claim_token,
    status, allowed_characters, claimed_at
  ) values (
    p_reward_code, 'SNS', 'SNS 후기 이벤트 · ' || p_campaign_id,
    coalesce(target_email, normalized_contact), target_user_id,
    translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_'),
    'AVAILABLE', 20000, timezone('utc', now())
  ) returning id into credit_id;

  update public.livesub_reward_grants
  set reward_credit_id = credit_id
  where submission_id = p_submission_id;

  return 'GRANTED';
end;
$$;

revoke all on function public.grant_livesub_reward(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.grant_livesub_reward(text, text, text, text, text) to service_role;

commit;
