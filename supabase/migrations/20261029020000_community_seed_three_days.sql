-- Check daily at 09:00 KST; the route skips if a post exists in the last
-- three publication days. Unlike */3 day-of-month, this crosses months evenly.
-- Preserve all existing posts and unrelated cron jobs.
begin;
select cron.unschedule(jobname) from cron.job
where jobname in ('community-seed-daily', 'community-seed-morning', 'community-seed-midday', 'community-seed-evening', 'community-seed-weekly', 'community-seed-three-days');
select cron.schedule('community-seed-three-days', '0 0 * * *', $$select private.trigger_community_seed()$$);
do $$
begin
  if (select count(*) from cron.job where jobname in
    ('community-seed-daily', 'community-seed-morning', 'community-seed-midday', 'community-seed-evening', 'community-seed-weekly', 'community-seed-three-days')) <> 1
    or not exists (select 1 from cron.job where jobname = 'community-seed-three-days' and schedule = '0 0 * * *' and active) then
    raise exception 'Expected one daily check; application enforces three publication days';
  end if;
end;
$$;
commit;
