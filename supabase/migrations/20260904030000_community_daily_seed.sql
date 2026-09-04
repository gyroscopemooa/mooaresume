-- 매일 자동 글(3) · 댓글(3) 기능. docs/handoff-community-mobile.md 118행 이하.
--
-- 하루 세 번 나눠 부릅니다 — 한 번에 3개를 다 만들면 같은 순간에 글 3개·
-- 댓글 3개가 한꺼번에 올라와서 오히려 자동화 티가 납니다. 라우트가 호출당
-- 1개씩만 만들도록 나눴습니다(src/app/api/community/seed/route.ts).
--
-- 글쓰기 트리거(set_community_alias)는 owner_user_id의 해시로 anonymous_alias를
-- 강제로 덮어씁니다(운영팀 계정도 "익명 XXXX"로 보입니다) — 그래서 "운영팀"이라고
-- 밝히려면 글/댓글 자체에 표시가 필요합니다. is_editorial이 그 표시입니다. 이
-- 컬럼이 없으면 화면에 배지를 달 방법이 없으므로 만들지 않습니다(문서 144행).
--
-- 스케줄은 20260822010000_schedule_analysis_advance.sql과 같은 방식입니다 —
-- private.app_config에서 URL·비밀을 읽는 pg_cron + pg_net. 그 마이그레이션이
-- 이미 pg_cron/pg_net/private 스키마/private.app_config를 만들어 뒀으므로
-- 여기서는 "없으면 만든다"로만 다시 선언합니다.

begin;

alter table public.community_posts add column if not exists is_editorial boolean not null default false;
alter table public.community_comments add column if not exists is_editorial boolean not null default false;

-- 그날 이미 운영팀 글을 몇 개 썼는지(0~3) 빠르게 세기 위한 색인. 전체 글
-- 수 대비 운영팀 글은 소수이므로 부분 색인으로 충분합니다.
create index if not exists community_posts_editorial_idx on public.community_posts (created_at) where is_editorial;

create extension if not exists pg_cron;
create extension if not exists pg_net;
create schema if not exists private;
revoke all on schema private from anon, authenticated;
create table if not exists private.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default timezone('utc', now())
);
revoke all on table private.app_config from anon, authenticated;

/*
 * analysis 쪽과 같은 이유로 설정이 없으면 조용히 아무것도 하지 않습니다 —
 * COMMUNITY_SEED_USER_ID를 아직 안 넣은 환경에서 이 잡이 매일 에러 로그를
 * 남기면 그게 곧 소음입니다.
 */
create or replace function private.trigger_community_seed()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  endpoint text;
  secret text;
begin
  select value into endpoint from private.app_config where key = 'community_seed_url';
  select value into secret from private.app_config where key = 'community_seed_cron_secret';
  if endpoint is null or secret is null then
    return;
  end if;

  perform net.http_post(
    url := endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function private.trigger_community_seed() from public, anon, authenticated;

-- 하루 세 번, 서로 몇 시간씩 떨어뜨려서 호출합니다(한국시간 오전 9시·오후
-- 1시·오후 6시 = 00:00·04:00·09:00 UTC). 라우트는 호출 한 번마다 글 1개 ·
-- 댓글 1개만 만들고, 그날 이미 3개를 다 썼으면 아무 것도 안 합니다 — 그래서
-- 이 잡이 중복 호출돼도 안전하고, 3개가 전부 같은 순간에 한꺼번에 올라오는
-- 부자연스러운 모습도 생기지 않습니다.
select cron.unschedule(jobname)
from cron.job
where jobname in ('community-seed-daily', 'community-seed-morning', 'community-seed-midday', 'community-seed-evening');

select cron.schedule('community-seed-morning', '0 0 * * *', $$select private.trigger_community_seed()$$);
select cron.schedule('community-seed-midday', '0 4 * * *', $$select private.trigger_community_seed()$$);
select cron.schedule('community-seed-evening', '0 9 * * *', $$select private.trigger_community_seed()$$);

commit;

-- 적용 후 Supabase SQL 에디터에서 값을 넣어야 실제로 호출됩니다(이 파일에는
-- 비밀을 두지 않습니다):
--
--   insert into private.app_config (key, value) values
--     ('community_seed_url', 'https://<your-domain>/api/community/seed'),
--     ('community_seed_cron_secret', '<COMMUNITY_SEED_CRON_SECRET과 같은 값>')
--   on conflict (key) do update set value = excluded.value, updated_at = timezone('utc', now());
--
-- 확인:
--   select * from cron.job where jobname like 'community-seed-%';
--   select * from cron.job_run_details order by start_time desc limit 10;
