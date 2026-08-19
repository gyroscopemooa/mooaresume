begin;

create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 254),
  source text not null default 'landing',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.waitlist_signups enable row level security;

commit;
