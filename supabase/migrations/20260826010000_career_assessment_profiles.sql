begin;

-- Required now because a result shown once cannot become the user's ongoing
-- Career Profile. Answers and computed results are versioned separately so a
-- future wording change never rewrites a past assessment.
create table if not exists public.career_assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  assessment_code text not null,
  assessment_version text not null,
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((status = 'COMPLETED') = (completed_at is not null))
);

create index if not exists career_assessment_sessions_owner_completed_idx
  on public.career_assessment_sessions(owner_user_id, completed_at desc);

drop trigger if exists career_assessment_sessions_updated_at on public.career_assessment_sessions;
create trigger career_assessment_sessions_updated_at before update on public.career_assessment_sessions
for each row execute function public.set_updated_at();

create table if not exists public.career_assessment_answers (
  session_id uuid not null references public.career_assessment_sessions(id) on delete cascade,
  item_id text not null,
  answer_value smallint not null check (answer_value between 1 and 5),
  answered_at timestamptz not null default timezone('utc', now()),
  primary key (session_id, item_id)
);

create table if not exists public.career_assessment_results (
  session_id uuid not null references public.career_assessment_sessions(id) on delete cascade,
  scale_code text not null,
  raw_score numeric not null,
  normalized_score numeric not null check (normalized_score between 0 and 100),
  interpretation_version text not null,
  computed_at timestamptz not null default timezone('utc', now()),
  primary key (session_id, scale_code)
);

alter table public.career_assessment_sessions enable row level security;
alter table public.career_assessment_answers enable row level security;
alter table public.career_assessment_results enable row level security;

drop policy if exists "career assessment session owner access" on public.career_assessment_sessions;
create policy "career assessment session owner access" on public.career_assessment_sessions for all to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists "career assessment answer owner access" on public.career_assessment_answers;
create policy "career assessment answer owner access" on public.career_assessment_answers for all to authenticated
  using (exists (
    select 1 from public.career_assessment_sessions s
    where s.id = session_id and s.owner_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.career_assessment_sessions s
    where s.id = session_id and s.owner_user_id = (select auth.uid())
  ));

drop policy if exists "career assessment result owner access" on public.career_assessment_results;
create policy "career assessment result owner access" on public.career_assessment_results for all to authenticated
  using (exists (
    select 1 from public.career_assessment_sessions s
    where s.id = session_id and s.owner_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.career_assessment_sessions s
    where s.id = session_id and s.owner_user_id = (select auth.uid())
  ));

commit;
