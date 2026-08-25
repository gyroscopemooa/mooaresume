-- Permission to learn from a real application, and the record that proves it.
--
-- The landing page says results are reflected "이용자 동의를 받아 익명으로".
-- Until this table exists that sentence has to stay in the future tense,
-- because a consent nobody recorded is a consent nobody has.
--
-- Three things the shape has to get right:
--
-- 1. Opt-in, never opt-out. The default row does not exist; absence means no.
-- 2. Revocable, and the revocation has to be as easy as the grant. A consent
--    that cannot be taken back is not consent.
-- 3. Versioned. The wording someone agreed to is part of what they agreed to,
--    so changing the copy has to invalidate the old agreement rather than
--    silently inherit it.
--
-- Collection itself is deliberately not wired up in this migration. The
-- permission and the redactor come first; turning the tap on is a separate,
-- reviewable change.

begin;

create table public.research_consents (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  -- Which wording was agreed to. Bumping this in the app makes every older
  -- agreement read as "not agreed to the current terms" without deleting the
  -- history of what was agreed before.
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  granted boolean not null,
  granted_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (granted and granted_at is not null and revoked_at is null)
    or (not granted and revoked_at is not null)
  )
);

alter table public.research_consents enable row level security;

create policy "research consent owner read" on public.research_consents for select to authenticated
  using ((select auth.uid()) = owner_user_id);

/*
 * Records or withdraws permission for the signed-in account.
 *
 * One function for both directions on purpose: a product where granting is a
 * button and withdrawing is a support ticket is not offering a choice.
 */
create or replace function public.set_research_consent(p_granted boolean, p_consent_version text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;
  if p_consent_version is null or char_length(p_consent_version) = 0 then
    raise exception 'CONSENT_VERSION_REQUIRED' using errcode = '22023';
  end if;

  insert into public.research_consents (
    owner_user_id, consent_version, granted, granted_at, revoked_at, updated_at
  ) values (
    current_user_id,
    p_consent_version,
    p_granted,
    case when p_granted then timezone('utc', now()) end,
    case when p_granted then null else timezone('utc', now()) end,
    timezone('utc', now())
  )
  on conflict (owner_user_id) do update
    set consent_version = excluded.consent_version,
        granted = excluded.granted,
        granted_at = case when excluded.granted then coalesce(public.research_consents.granted_at, excluded.granted_at) else public.research_consents.granted_at end,
        revoked_at = excluded.revoked_at,
        updated_at = excluded.updated_at;

  return jsonb_build_object('granted', p_granted, 'consentVersion', p_consent_version);
end;
$$;

/*
 * Answers "may this account's work be studied", for the collection step that
 * comes next.
 *
 * Takes the current wording as an argument rather than reading the stored one:
 * agreeing to last month's sentence is not agreement to this month's, and the
 * check has to fail closed when the copy changes.
 */
create or replace function public.has_research_consent(p_owner_user_id uuid, p_consent_version text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.research_consents rc
    where rc.owner_user_id = p_owner_user_id
      and rc.granted
      and rc.consent_version = p_consent_version
  );
$$;

revoke all on function public.set_research_consent(boolean, text) from public;
grant execute on function public.set_research_consent(boolean, text) to authenticated;
revoke all on function public.has_research_consent(uuid, text) from public;
grant execute on function public.has_research_consent(uuid, text) to service_role;

commit;
