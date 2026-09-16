-- User requested one automatic community post per day.
-- Retain the existing 09:00 Asia/Seoul publication time (00:00 UTC).
-- Existing posts/comments and unrelated scheduled jobs are unchanged.
begin;

select cron.unschedule(jobname)
from cron.job
where jobname in ('community-seed-daily', 'community-seed-morning', 'community-seed-midday', 'community-seed-evening');

select cron.schedule('community-seed-morning', '0 0 * * *', $$select private.trigger_community_seed()$$);

do $$
begin
  if (select count(*) from cron.job where jobname in
    ('community-seed-daily', 'community-seed-morning', 'community-seed-midday', 'community-seed-evening')) <> 1
    or not exists (select 1 from cron.job where jobname = 'community-seed-morning'
      and schedule = '0 0 * * *' and active) then
    raise exception 'Expected exactly one active community seed job at 00:00 UTC';
  end if;
end;
$$;

commit;
