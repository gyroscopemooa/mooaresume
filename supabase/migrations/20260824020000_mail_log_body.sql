-- Keeps what was actually sent, not just who it went to.
--
-- mail_send_log answered "who got it, when, under what subject, and did it
-- work". It could not answer "what did I write", which is the question the
-- operator actually has a week later — and with attachments now possible, not
-- even "what went with it". The console could show a send history that nobody
-- could read.
--
-- Stored per row rather than per batch: one extra table would have to be
-- joined on every read of a log whose whole purpose is to be read at a glance,
-- and a batch is at most 50 rows.

begin;

alter table public.mail_send_log
  add column if not exists body text
    check (body is null or char_length(body) <= 50000),
  -- Names only. The files themselves are already in the recipient's mailbox,
  -- and copying attachments into the database would put megabytes of payload
  -- behind a page that only needs to say what was attached.
  add column if not exists attachment_names text[];

commit;
