-- Finishes analyses the browser stopped watching.
--
-- Only the open checkout page ever drove a run to completion, so closing the
-- tab left the model's finished work unfetched: the run stayed RUNNING, the
-- completion email never sent, and the ten-minute refund never fired. This
-- schedules a call to /api/analysis-runs/advance, which does all three.
--
-- See docs/background-analysis-completion-decision.md.

begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The endpoint URL and the shared secret must not live in a committed
-- migration, so they are read from a table the operator fills in by hand. The
-- schema is deliberately outside the API surface.
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default timezone('utc', now())
);
revoke all on table private.app_config from anon, authenticated;

/*
 * Returns quietly when the configuration is absent. A scheduled job that
 * errors every minute because a value was never filled in produces noise, not
 * information — and this job doing nothing is the same as the behaviour before
 * it existed.
 */
create or replace function private.advance_analysis_runs()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  endpoint text;
  secret text;
begin
  select value into endpoint from private.app_config where key = 'analysis_advance_url';
  select value into secret from private.app_config where key = 'analysis_cron_secret';
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
    timeout_milliseconds := 60000
  );
end;
$$;

revoke all on function private.advance_analysis_runs() from public, anon, authenticated;

-- Every minute. The endpoint handles at most five runs per call and returns
-- immediately when there is nothing to do, so a quiet minute costs one request.
-- An analysis takes five to ten minutes and the refund deadline is ten, so the
-- check has to be well inside that.
select cron.unschedule('advance-analysis-runs')
where exists (select 1 from cron.job where jobname = 'advance-analysis-runs');

select cron.schedule(
  'advance-analysis-runs',
  '* * * * *',
  $$select private.advance_analysis_runs()$$
);

commit;

-- After applying this, set the two values from the Supabase SQL editor. They
-- are not in this file on purpose:
--
--   insert into private.app_config (key, value) values
--     ('analysis_advance_url', 'https://<your-domain>/api/analysis-runs/advance'),
--     ('analysis_cron_secret', '<the same value as ANALYSIS_CRON_SECRET>')
--   on conflict (key) do update set value = excluded.value, updated_at = timezone('utc', now());
--
-- Check that it is running:
--   select * from cron.job where jobname = 'advance-analysis-runs';
--   select * from cron.job_run_details order by start_time desc limit 10;
