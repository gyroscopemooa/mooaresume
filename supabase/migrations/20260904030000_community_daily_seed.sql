-- 매일 자동 글(3) · 댓글(3) 기능. docs/handoff-community-mobile.md 118행 이하.
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

-- 그날 이미 운영팀 글을 썼는지 빠르게 확인하기 위한 색인. 전체 글 수 대비
-- 운영팀 글은 소수이므로 부분 색인으로 충분합니다.
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

-- 하루 한 번, 22:00 UTC(한국시간 오전 7시). 라우트 자체가 그날 이미 쓴
-- 운영팀 글이 있으면 아무 것도 안 하므로, 이 잡이 중복 호출돼도 안전합니다.
select cron.unschedule('community-seed-daily')
where exists (select 1 from cron.job where jobname = 'community-seed-daily');

select cron.schedule(
  'community-seed-daily',
  '0 22 * * *',
  $$select private.trigger_community_seed()$$
);

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
--   select * from cron.job where jobname = 'community-seed-daily';
--   select * from cron.job_run_details order by start_time desc limit 10;
