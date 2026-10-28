begin;

-- Private recruitment records, separate from paid experts and document reviews.
create table public.mentor_pool_applications (
  id uuid primary key,
  kind text not null check (kind in ('mentee', 'mentor')),
  name text not null check (char_length(name) between 1 and 60),
  email text not null check (char_length(email) between 3 and 254),
  headline text not null check (char_length(headline) between 2 and 160),
  story text not null check (char_length(story) between 10 and 2000),
  fields text[] not null default '{}' check (cardinality(fields) <= 4 and fields <@ array['technology','industry','creative','business','public','care','learning','life','exploring','other']::text[]),
  mode text not null check (mode in ('online','either','offline')),
  region text not null default '' check (char_length(region) <= 120),
  availability text not null default '' check (char_length(availability) <= 120),
  consent_version text not null,
  consented_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','reviewing','waiting','contacted','connected','closed')),
  admin_note text not null default '' check (char_length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 year'),
  check (mode = 'online' or char_length(region) > 0)
);
create index mentor_pool_created on public.mentor_pool_applications (created_at desc);
create index mentor_pool_expiry on public.mentor_pool_applications (expires_at);
alter table public.mentor_pool_applications enable row level security;
revoke all on public.mentor_pool_applications from public, anon, authenticated;
grant select, insert, update, delete on public.mentor_pool_applications to service_role;

-- HMAC identifiers only; no raw IP stored. Needed for anonymous intake now.
create table public.mentor_pool_rate_limits (
  subject text primary key check (char_length(subject) <= 80),
  attempts integer not null default 1,
  expires_at timestamptz not null
);
alter table public.mentor_pool_rate_limits enable row level security;
revoke all on public.mentor_pool_rate_limits from public, anon, authenticated;
grant all on public.mentor_pool_rate_limits to service_role;

create function public.take_mentor_pool_limit(p_subject text, p_limit integer, p_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_attempts integer;
begin
  if p_limit not between 1 and 100 or p_seconds not between 1 and 86400 then
    raise exception 'INVALID_LIMIT';
  end if;
  insert into public.mentor_pool_rate_limits as r (subject, attempts, expires_at)
  values (p_subject, 1, now() + make_interval(secs => p_seconds))
  on conflict (subject) do update set
    attempts = case when r.expires_at <= now() then 1 else least(r.attempts + 1, p_limit + 1) end,
    expires_at = case when r.expires_at <= now() then now() + make_interval(secs => p_seconds) else r.expires_at end
  returning attempts into v_attempts;
  return v_attempts <= p_limit;
end;
$$;
revoke all on function public.take_mentor_pool_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.take_mentor_pool_limit(text,integer,integer) to service_role;

-- Existing deployment already uses pg_cron. Fail migration if unavailable,
-- rather than silently promise retention without installing cleanup.
select cron.schedule('mentor-pool-retention', '17 18 * * *',
  $$delete from public.mentor_pool_applications where expires_at <= now();
    delete from public.mentor_pool_rate_limits where expires_at <= now();$$);
commit;
