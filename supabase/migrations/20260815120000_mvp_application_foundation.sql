begin;

create extension if not exists pgcrypto;

create type public.application_case_status as enum ('DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'COMPLETED', 'ARCHIVED');
create type public.document_kind as enum ('JOB_POSTING', 'COVER_LETTER', 'RESUME', 'CAREER_DOCUMENT', 'PORTFOLIO', 'OTHER');
create type public.create_stage as enum ('JOB_ANALYSIS', 'EXPERIENCE_DISCOVERY', 'EXPERIENCE_SELECTION', 'FOLLOW_UP', 'OUTLINE', 'DRAFT', 'REVISION', 'FINAL_REVIEW', 'INTERVIEW_PREP');

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.application_cases (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  company_name text,
  role_name text,
  recruitment_cycle text,
  status public.application_case_status not null default 'DRAFT',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index application_cases_owner_idx on public.application_cases(owner_user_id, updated_at desc);
create trigger application_cases_updated_at before update on public.application_cases for each row execute function public.set_updated_at();

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  application_case_id uuid not null references public.application_cases(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind public.document_kind not null,
  title text not null check (char_length(title) between 1 and 160),
  created_at timestamptz not null default timezone('utc', now())
);

create index documents_case_idx on public.documents(application_case_id, created_at);
create index documents_owner_idx on public.documents(owner_user_id);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  source_type text not null check (source_type in ('TEXT', 'FILE', 'URL')),
  storage_path text,
  mime_type text,
  original_filename text,
  normalized_text text,
  content_sha256 text,
  character_count integer check (character_count is null or character_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique(document_id, version_number),
  check (normalized_text is not null or storage_path is not null)
);

create index document_versions_document_idx on public.document_versions(document_id, version_number desc);
create index document_versions_owner_idx on public.document_versions(owner_user_id);

create table public.submission_snapshots (
  id uuid primary key default gen_random_uuid(),
  application_case_id uuid not null references public.application_cases(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text,
  created_at timestamptz not null default timezone('utc', now())
);

create index submission_snapshots_case_idx on public.submission_snapshots(application_case_id, created_at desc);

create table public.submission_snapshot_items (
  snapshot_id uuid not null references public.submission_snapshots(id) on delete cascade,
  document_version_id uuid not null references public.document_versions(id) on delete restrict,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('PRIMARY', 'JOB_CONTEXT', 'REFERENCE')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key(snapshot_id, document_version_id)
);

create index snapshot_items_version_idx on public.submission_snapshot_items(document_version_id);

create table public.create_workflow_states (
  application_case_id uuid primary key references public.application_cases(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stage public.create_stage not null default 'JOB_ANALYSIS',
  candidate_facts jsonb not null default '[]'::jsonb check (jsonb_typeof(candidate_facts) = 'array'),
  experience_candidates jsonb not null default '[]'::jsonb check (jsonb_typeof(experience_candidates) = 'array'),
  selected_experience_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(selected_experience_ids) = 'array'),
  follow_up_answers jsonb not null default '{}'::jsonb check (jsonb_typeof(follow_up_answers) = 'object'),
  approved_fact_summary text,
  outline text,
  current_draft text,
  revision_count integer not null default 0 check (revision_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index create_workflow_owner_idx on public.create_workflow_states(owner_user_id, updated_at desc);
create trigger create_workflow_updated_at before update on public.create_workflow_states for each row execute function public.set_updated_at();

alter table public.application_cases enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.submission_snapshots enable row level security;
alter table public.submission_snapshot_items enable row level security;
alter table public.create_workflow_states enable row level security;

create policy "application case owner access" on public.application_cases for all to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

create policy "document owner read delete" on public.documents for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy "document owner insert" on public.documents for insert to authenticated with check (
  (select auth.uid()) = owner_user_id and exists (
    select 1 from public.application_cases c where c.id = application_case_id and c.owner_user_id = (select auth.uid())
  )
);
create policy "document owner update" on public.documents for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id and exists (
    select 1 from public.application_cases c where c.id = application_case_id and c.owner_user_id = (select auth.uid())
  ));
create policy "document owner delete" on public.documents for delete to authenticated using ((select auth.uid()) = owner_user_id);

create policy "version owner read" on public.document_versions for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy "version owner insert" on public.document_versions for insert to authenticated with check (
  (select auth.uid()) = owner_user_id and exists (
    select 1 from public.documents d where d.id = document_id and d.owner_user_id = (select auth.uid())
  )
);
create policy "version owner delete" on public.document_versions for delete to authenticated using ((select auth.uid()) = owner_user_id);

create policy "snapshot owner read delete" on public.submission_snapshots for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy "snapshot owner insert" on public.submission_snapshots for insert to authenticated with check (
  (select auth.uid()) = owner_user_id and exists (
    select 1 from public.application_cases c where c.id = application_case_id and c.owner_user_id = (select auth.uid())
  )
);
create policy "snapshot owner delete" on public.submission_snapshots for delete to authenticated using ((select auth.uid()) = owner_user_id);

create policy "snapshot item owner read" on public.submission_snapshot_items for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy "snapshot item owner insert" on public.submission_snapshot_items for insert to authenticated with check (
  (select auth.uid()) = owner_user_id
  and exists (select 1 from public.submission_snapshots s where s.id = snapshot_id and s.owner_user_id = (select auth.uid()))
  and exists (select 1 from public.document_versions v where v.id = document_version_id and v.owner_user_id = (select auth.uid()))
);
create policy "snapshot item owner delete" on public.submission_snapshot_items for delete to authenticated using ((select auth.uid()) = owner_user_id);

create policy "workflow owner read" on public.create_workflow_states for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy "workflow owner insert" on public.create_workflow_states for insert to authenticated with check (
  (select auth.uid()) = owner_user_id and exists (
    select 1 from public.application_cases c where c.id = application_case_id and c.owner_user_id = (select auth.uid())
  )
);
create policy "workflow owner update" on public.create_workflow_states for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id and exists (
    select 1 from public.application_cases c where c.id = application_case_id and c.owner_user_id = (select auth.uid())
  ));
create policy "workflow owner delete" on public.create_workflow_states for delete to authenticated using ((select auth.uid()) = owner_user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('application-documents', 'application-documents', false, 10485760, array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload own application documents" on storage.objects for insert to authenticated with check (
  bucket_id = 'application-documents' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "users read own application documents" on storage.objects for select to authenticated using (
  bucket_id = 'application-documents' and owner_id = (select auth.uid())::text
);
create policy "users update own application documents" on storage.objects for update to authenticated
  using (bucket_id = 'application-documents' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'application-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete own application documents" on storage.objects for delete to authenticated using (
  bucket_id = 'application-documents' and owner_id = (select auth.uid())::text
);

commit;
