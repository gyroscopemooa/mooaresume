begin;

-- Private, on-demand comparison runs. No customer results, billing or analysis cursor writes.
create table public.admin_editing_experiments (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.research_snapshots(id) on delete cascade,
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  consent_version text not null,
  protocol_version text not null,
  mode text not null check (mode in ('REWRITE','SENTENCE')),
  state text not null check (state in ('PREPARED','STARTING','GENERATING','PROPOSED','REVIEW_STARTING','REVIEWING','REVIEWED','FINAL_STARTING','FINAL_REVIEWING','COMPLETED','FAILED','UNCERTAIN')),
  model text not null,
  redacted_input jsonb not null,
  proposal jsonb,
  review jsonb,
  final_review jsonb,
  combined jsonb,
  response_id text,
  usage jsonb not null default '[]'::jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (snapshot_id, mode, protocol_version)
);
alter table public.admin_editing_experiments enable row level security;
revoke all on public.admin_editing_experiments from anon, authenticated;
grant all on public.admin_editing_experiments to service_role;

create function public.guard_editing_experiment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Lock consent against concurrent withdrawal until this write commits.
  perform 1 from public.research_consents c
    where c.owner_user_id = new.owner_user_id and c.granted and c.revoked_at is null
      and c.consent_version = new.consent_version for share;
  if not found then raise exception 'EXPERIMENT_NO_CONSENT'; end if;
  perform 1 from public.research_snapshots s where s.id = new.snapshot_id
    and s.owner_user_id = new.owner_user_id and s.analysis_run_id = new.analysis_run_id
    and s.consent_version = new.consent_version;
  if not found then raise exception 'EXPERIMENT_SNAPSHOT_MISMATCH'; end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger guard_editing_experiment before insert or update on public.admin_editing_experiments
for each row execute function public.guard_editing_experiment();

create function public.purge_editing_experiments_on_consent() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.admin_editing_experiments where owner_user_id = old.owner_user_id;
    return old;
  end if;
  if not new.granted or new.revoked_at is not null or new.consent_version is distinct from old.consent_version then
    delete from public.admin_editing_experiments where owner_user_id = new.owner_user_id;
  end if;
  return new;
end;
$$;
create trigger purge_editing_experiments_on_consent after update or delete on public.research_consents
for each row execute function public.purge_editing_experiments_on_consent();
revoke all on function public.guard_editing_experiment() from public;
revoke all on function public.purge_editing_experiments_on_consent() from public;
commit;
