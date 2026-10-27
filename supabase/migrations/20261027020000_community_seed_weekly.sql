-- User requested one automatic community post per week (2026-10-27).
-- Publish on Mondays at 09:00 Asia/Seoul (00:00 UTC Monday).
-- The app route also skips generation if an editorial post exists in the last 7 publication days.
-- Existing posts/comments and unrelated scheduled jobs are unchanged.
begin;

select cron.unschedule(jobname)
from cron.job
where jobname in ('community-seed-daily', 'community-seed-morning', 'community-seed-midday', 'community-seed-evening', 'community-seed-weekly');

select cron.schedule('community-seed-weekly', '0 0 * * 1', $$select private.trigger_community_seed()$$);

do $$
begin
  if (select count(*) from cron.job where jobname in
    ('community-seed-daily', 'community-seed-morning', 'community-seed-midday', 'community-seed-evening', 'community-seed-weekly')) <> 1
    or not exists (select 1 from cron.job where jobname = 'community-seed-weekly'
      and schedule = '0 0 * * 1' and active) then
    raise exception 'Expected exactly one active community seed job on Mondays at 00:00 UTC';
  end if;
end;
$$;

commit;
