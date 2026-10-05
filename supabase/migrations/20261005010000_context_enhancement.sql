-- Per-run opt-in and immutable-by-application research snapshot; no new tables.
begin;
alter table public.analysis_runs add column context_enhancement jsonb
  check (context_enhancement is null or jsonb_typeof(context_enhancement) = 'object');
alter table public.analysis_runs add column context_research jsonb
  check (context_research is null or jsonb_typeof(context_research) = 'object');

create function public.initialize_context_research() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  -- Owner INSERT permission must not allow forged server research snapshots.
  new.context_research := null;
  return new;
end;
$$;
create trigger initialize_context_research before insert on public.analysis_runs
  for each row execute function public.initialize_context_research();
revoke all on function public.initialize_context_research() from public;

-- Preserve the deployed function's full current body (including prior fixes).
-- Fail closed if its expected insert has changed, rather than silently dropping opt-in.
do $$
declare original text; patched text;
begin
  select pg_get_functiondef('public.create_application_case_from_plan(jsonb)'::regprocedure) into original;
  original := replace(original, E'\r\n', E'\n');
  patched := replace(original, E'    schema_version\n', E'    schema_version,\n    context_enhancement\n');
  patched := replace(patched, E'    ''1.0''\n  ) returning id into run_id;', E'    ''1.0'',\n    case when jsonb_typeof(p_plan->''contextEnhancement'') = ''object'' then p_plan->''contextEnhancement'' else null end\n  ) returning id into run_id;');
  if patched = original or position('context_enhancement' in patched) = 0 or position('jsonb_typeof(p_plan->''contextEnhancement'')' in patched) = 0 then
    raise exception 'CONTEXT_ENHANCEMENT_FUNCTION_SHAPE_CHANGED';
  end if;
  execute patched;
end;
$$;
-- Existing owner-read/insert RLS is retained. Browser roles have no update
-- policy for analysis_runs; only server-side execution writes research results.
commit;
