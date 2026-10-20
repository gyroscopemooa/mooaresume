-- Private, bounded work queue. No customer result updates, mail, or historical backfill.
create table public.automatic_second_reviews (
  analysis_run_id uuid primary key references public.analysis_runs(id) on delete cascade,
  status text not null default 'pending' check (status in
    ('pending','draft_starting','draft_running','verify_pending','verify_starting','verify_running','completed','needs_attention')),
  lease_token uuid,
  lease_until timestamptz,
  next_poll_at timestamptz not null default now(),
  draft_response_id text,
  verify_response_id text,
  context jsonb,
  draft jsonb,
  verification jsonb,
  execution jsonb not null default '{}',
  failure_code text,
  preview_id uuid references public.admin_analysis_previews(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.automatic_second_reviews enable row level security;
revoke all on public.automatic_second_reviews from anon, authenticated;
grant all on public.automatic_second_reviews to service_role;
create index automatic_second_reviews_pending on public.automatic_second_reviews(next_poll_at)
  where status not in ('completed','needs_attention');

create function public.enqueue_automatic_second_review() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'COMPLETED' and old.status is distinct from new.status
     and new.product in ('QUICK','PRO','FINAL') then
    insert into public.automatic_second_reviews(analysis_run_id)
    values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.enqueue_automatic_second_review() from public, anon, authenticated;
create trigger enqueue_automatic_second_review
after update of status on public.analysis_runs
for each row execute function public.enqueue_automatic_second_review();

create function public.claim_automatic_second_review()
returns setof public.automatic_second_reviews
language sql security definer set search_path = public, pg_temp as $$
  update public.automatic_second_reviews
  set lease_token = gen_random_uuid(), lease_until = now() + interval '3 minutes', updated_at = now()
  where analysis_run_id = (
    select analysis_run_id from public.automatic_second_reviews
    where status not in ('completed','needs_attention')
      and next_poll_at <= now() and (lease_until is null or lease_until < now())
    order by next_poll_at, created_at for update skip locked limit 1
  ) returning *;
$$;
revoke all on function public.claim_automatic_second_review() from public, anon, authenticated;
grant execute on function public.claim_automatic_second_review() to service_role;

-- Atomic immutable preview insertion and queue completion. A stale worker cannot publish.
create function public.finish_automatic_second_review(p_run uuid, p_lease uuid, p_answers jsonb, p_notes text, p_verification jsonb, p_execution jsonb)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare saved_id uuid;
begin
  perform 1 from public.automatic_second_reviews
    where analysis_run_id = p_run and lease_token = p_lease
      and lease_until > now() and status = 'verify_running' for update;
  if not found then raise exception 'SECOND_REVIEW_LEASE_LOST'; end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) < 1
    or p_verification->>'approved' is distinct from 'true' then
    raise exception 'SECOND_REVIEW_INVALID_FINISH';
  end if;
  insert into public.admin_analysis_previews(analysis_run_id,title,revised_answers,notes)
    values(p_run,'AI 컨설턴트 2차 검토본 · 관리자 확인 대기',p_answers,p_notes)
    returning id into saved_id;
  update public.automatic_second_reviews set status='completed',preview_id=saved_id,
    verification=p_verification,execution=p_execution,lease_token=null,lease_until=null,updated_at=now()
    where analysis_run_id=p_run;
  return saved_id;
end;
$$;
revoke all on function public.finish_automatic_second_review(uuid,uuid,jsonb,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.finish_automatic_second_review(uuid,uuid,jsonb,text,jsonb,jsonb) to service_role;
