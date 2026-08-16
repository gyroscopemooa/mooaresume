begin;

do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef('public.create_application_case_from_plan(jsonb)'::regprocedure)
  into function_definition;

  if position('public.digest' in function_definition) > 0 then
    execute replace(function_definition, 'public.digest', 'extensions.digest');
  end if;
end;
$migration$;

commit;
