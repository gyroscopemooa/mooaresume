-- Admin console storage.
--
-- Two things the operator asked to see had nowhere to be recorded: which
-- addresses a manual mail actually reached, and inquiries from the (not yet
-- built) contact form. Both tables are service-role only — they carry other
-- people's addresses and messages, so no policy grants a signed-in user
-- access, and RLS with zero policies denies everyone but the secret key.

begin;

create table public.mail_send_log (
  id uuid primary key default gen_random_uuid(),
  -- One row per recipient, not per compose: a send that reaches four people
  -- and fails for a fifth has to be answerable per address.
  batch_id uuid not null,
  recipient text not null check (char_length(recipient) between 3 and 254),
  subject text not null check (char_length(subject) between 1 and 200),
  reply_to text,
  status text not null check (status in ('SENT', 'FAILED')),
  error_message text,
  sent_at timestamptz not null default timezone('utc', now())
);

create index mail_send_log_sent_idx on public.mail_send_log(sent_at desc);
create index mail_send_log_batch_idx on public.mail_send_log(batch_id, recipient);
create index mail_send_log_recipient_idx on public.mail_send_log(recipient, sent_at desc);

create type public.inquiry_status as enum ('NEW', 'IN_PROGRESS', 'ANSWERED', 'CLOSED');

create table public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text check (name is null or char_length(name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254),
  category text check (category is null or char_length(category) between 1 and 40),
  message text not null check (char_length(message) between 1 and 10000),
  status public.inquiry_status not null default 'NEW',
  admin_note text check (admin_note is null or char_length(admin_note) <= 4000),
  answered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index contact_inquiries_queue_idx on public.contact_inquiries(status, created_at desc);
create trigger contact_inquiries_updated_at before update on public.contact_inquiries
for each row execute function public.set_updated_at();

alter table public.mail_send_log enable row level security;
alter table public.contact_inquiries enable row level security;

commit;
