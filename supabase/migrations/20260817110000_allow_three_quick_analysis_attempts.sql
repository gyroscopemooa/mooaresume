begin;

alter table public.analysis_runs
  drop constraint if exists analysis_runs_attempt_count_check;

alter table public.analysis_runs
  add constraint analysis_runs_attempt_count_check
  check (attempt_count between 0 and 3);

commit;
