begin;

create table public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  schema_version text not null default '1.0',
  profile_data jsonb not null default '{}'::jsonb check (jsonb_typeof(profile_data) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(owner_user_id)
);

create trigger candidate_profiles_updated_at before update on public.candidate_profiles
for each row execute function public.set_updated_at();

create table public.candidate_profile_snapshots (
  id uuid primary key default gen_random_uuid(),
  application_case_id uuid not null references public.application_cases(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_profile_id uuid references public.candidate_profiles(id) on delete set null,
  schema_version text not null default '1.0',
  snapshot_data jsonb not null check (jsonb_typeof(snapshot_data) = 'object'),
  confirmation_status text not null default 'UNREVIEWED'
    check (confirmation_status in ('UNREVIEWED', 'USER_REVIEWED', 'USER_CONFIRMED')),
  captured_at timestamptz not null default timezone('utc', now()),
  confirmed_at timestamptz,
  unique(application_case_id)
);

create index candidate_profile_snapshots_owner_idx on public.candidate_profile_snapshots(owner_user_id, captured_at desc);

alter table public.candidate_profiles enable row level security;
alter table public.candidate_profile_snapshots enable row level security;

create policy "candidate profile owner access" on public.candidate_profiles for all to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

create policy "candidate snapshot owner read delete" on public.candidate_profile_snapshots for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy "candidate snapshot owner insert" on public.candidate_profile_snapshots for insert to authenticated
  with check (
    (select auth.uid()) = owner_user_id and exists (
      select 1 from public.application_cases c
      where c.id = application_case_id and c.owner_user_id = (select auth.uid())
    )
  );
create policy "candidate snapshot owner update" on public.candidate_profile_snapshots for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check (
    (select auth.uid()) = owner_user_id and exists (
      select 1 from public.application_cases c
      where c.id = application_case_id and c.owner_user_id = (select auth.uid())
    )
  );
create policy "candidate snapshot owner delete" on public.candidate_profile_snapshots for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

commit;

