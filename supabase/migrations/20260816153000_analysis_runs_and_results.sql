begin;

create type public.analysis_run_status as enum ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  submission_snapshot_id uuid not null references public.submission_snapshots(id) on delete restrict,
  application_case_id uuid not null references public.application_cases(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product text not null check (product in ('QUICK', 'PRO')),
  writing_mode text not null check (writing_mode in ('CREATE', 'BUILD', 'POLISH')),
  writing_style text not null check (writing_style in ('CONCISE', 'BALANCED', 'STRENGTH_FOCUSED')),
  target_length integer not null check (target_length between 100 and 3000),
  status public.analysis_run_status not null default 'PENDING',
  attempt_count integer not null default 0 check (attempt_count between 0 and 2),
  provider text,
  model text,
  prompt_version text,
  rubric_version text,
  schema_version text not null default '1.0',
  response_id text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  failure_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (status <> 'COMPLETED' or completed_at is not null),
  check (status <> 'FAILED' or failure_code is not null)
);

create index analysis_runs_case_idx on public.analysis_runs(application_case_id, created_at desc);
create index analysis_runs_owner_idx on public.analysis_runs(owner_user_id, created_at desc);
create trigger analysis_runs_updated_at before update on public.analysis_runs
for each row execute function public.set_updated_at();

create table public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null unique references public.analysis_runs(id) on delete cascade,
  application_case_id uuid not null references public.application_cases(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  schema_version text not null,
  result_data jsonb not null check (jsonb_typeof(result_data) = 'object'),
  created_at timestamptz not null default timezone('utc', now())
);

create index analysis_results_case_idx on public.analysis_results(application_case_id, created_at desc);

alter table public.analysis_runs enable row level security;
alter table public.analysis_results enable row level security;

drop policy "snapshot item owner insert" on public.submission_snapshot_items;
drop policy "snapshot item owner delete" on public.submission_snapshot_items;
create policy "snapshot item owner insert before run" on public.submission_snapshot_items
  for insert to authenticated with check (
    (select auth.uid()) = owner_user_id
    and exists (
      select 1 from public.submission_snapshots s
      where s.id = snapshot_id and s.owner_user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.document_versions v
      where v.id = document_version_id and v.owner_user_id = (select auth.uid())
    )
    and not exists (
      select 1 from public.analysis_runs r where r.submission_snapshot_id = snapshot_id
    )
  );
create policy "snapshot item owner delete before run" on public.submission_snapshot_items
  for delete to authenticated using (
    (select auth.uid()) = owner_user_id
    and not exists (
      select 1 from public.analysis_runs r where r.submission_snapshot_id = snapshot_id
    )
  );

create policy "analysis run owner read" on public.analysis_runs for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy "analysis run owner insert" on public.analysis_runs for insert to authenticated
  with check (
    (select auth.uid()) = owner_user_id
    and exists (
      select 1 from public.application_cases c
      where c.id = application_case_id and c.owner_user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.submission_snapshots s
      where s.id = submission_snapshot_id
        and s.application_case_id = application_case_id
        and s.owner_user_id = (select auth.uid())
    )
  );

create policy "analysis result owner read" on public.analysis_results for select to authenticated
  using ((select auth.uid()) = owner_user_id);

create function public.create_application_case_from_plan(p_plan jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  case_id uuid;
  snapshot_id uuid;
  run_id uuid;
  document_id uuid;
  version_id uuid;
  document_item jsonb;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  if jsonb_typeof(p_plan->'documents') <> 'array' or jsonb_array_length(p_plan->'documents') = 0 then
    raise exception 'DOCUMENT_REQUIRED' using errcode = '22023';
  end if;

  insert into public.application_cases (
    owner_user_id, title, company_name, role_name, status
  ) values (
    current_user_id,
    p_plan->>'title',
    nullif(p_plan->>'companyName', ''),
    nullif(p_plan->>'roleName', ''),
    'DRAFT'
  ) returning id into case_id;

  insert into public.submission_snapshots (
    application_case_id, owner_user_id, label
  ) values (
    case_id, current_user_id, '최초 분석 입력'
  ) returning id into snapshot_id;

  for document_item in select value from jsonb_array_elements(p_plan->'documents')
  loop
    insert into public.documents (
      application_case_id, owner_user_id, kind, title
    ) values (
      case_id,
      current_user_id,
      (document_item->>'kind')::public.document_kind,
      document_item->>'title'
    ) returning id into document_id;

    insert into public.document_versions (
      document_id,
      owner_user_id,
      version_number,
      source_type,
      original_filename,
      normalized_text,
      content_sha256,
      character_count
    ) values (
      document_id,
      current_user_id,
      1,
      document_item->>'sourceType',
      nullif(document_item->>'originalFilename', ''),
      document_item->>'normalizedText',
      encode(extensions.digest(convert_to(document_item->>'normalizedText', 'UTF8'), 'sha256'), 'hex'),
      char_length(regexp_replace(document_item->>'normalizedText', '\s', '', 'g'))
    ) returning id into version_id;

    insert into public.submission_snapshot_items (
      snapshot_id, document_version_id, owner_user_id, purpose
    ) values (
      snapshot_id,
      version_id,
      current_user_id,
      document_item->>'purpose'
    );
  end loop;

  insert into public.analysis_runs (
    submission_snapshot_id,
    application_case_id,
    owner_user_id,
    product,
    writing_mode,
    writing_style,
    target_length,
    status,
    schema_version
  ) values (
    snapshot_id,
    case_id,
    current_user_id,
    p_plan->>'product',
    p_plan->>'writingMode',
    p_plan->>'writingStyle',
    (p_plan->>'targetLength')::integer,
    'PENDING',
    '1.0'
  ) returning id into run_id;

  return jsonb_build_object(
    'applicationCaseId', case_id,
    'submissionSnapshotId', snapshot_id,
    'analysisRunId', run_id
  );
end;
$$;

revoke all on function public.create_application_case_from_plan(jsonb) from public;
grant execute on function public.create_application_case_from_plan(jsonb) to authenticated;

commit;
