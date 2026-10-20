begin;

-- Administrator-only recovery drafts. These never replace applicant results,
-- analysis runs, billing, entitlements, or immutable input snapshots.
create table public.admin_analysis_previews (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  revised_answers jsonb not null,
  notes text not null default '' check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_analysis_previews enable row level security;
revoke all on public.admin_analysis_previews from anon, authenticated;
grant all on public.admin_analysis_previews to service_role;

create index admin_analysis_previews_run_created_idx
  on public.admin_analysis_previews (analysis_run_id, created_at desc);

commit;
