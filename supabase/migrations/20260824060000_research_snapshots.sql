-- The de-identified copies themselves.
--
-- 20260824050000 recorded permission; this is what permission is for. Nothing
-- lands here without a matching consent row at the current wording, and the
-- check happens inside the function rather than in application code, so a bug
-- upstream cannot quietly start collecting.
--
-- The owner id is kept, and that is a deliberate trade rather than an oversight.
-- Content is redacted; the link is not. Without the link, "철회하면 지웁니다"
-- would be a promise with no way to keep it — we would not know which rows were
-- yours. Keeping it is what makes deletion possible, so revoking consent below
-- deletes on the spot rather than only stopping future collection.

begin;

create table if not exists public.research_snapshots (
  id uuid primary key default gen_random_uuid(),
  -- One row per run. A retried analysis overwrites rather than accumulating,
  -- so the corpus never counts one application twice.
  analysis_run_id uuid not null unique references public.analysis_runs(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,

  product text not null check (product in ('QUICK', 'PRO', 'FINAL')),
  writing_mode text not null,
  editing_stance text not null,

  -- Redacted before it reaches this table. The column names say "redacted" so
  -- nobody reading a query later assumes otherwise.
  redacted_original text not null check (char_length(redacted_original) <= 200000),
  redacted_revised text not null check (char_length(redacted_revised) <= 200000),
  -- What the redactor removed, by kind and count. Kept so the quality of the
  -- redaction can be audited without reading anyone's application.
  redaction_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(redaction_summary) = 'object'),

  readiness_score integer check (readiness_score between 0 and 100),
  -- Which sentences the analysis objected to, without the applicant attached.
  -- This is the part that actually teaches: the same objection recurring across
  -- hundreds of applications is a rule worth writing down.
  findings jsonb not null default '[]'::jsonb check (jsonb_typeof(findings) = 'array'),

  consent_version text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists research_snapshots_owner_idx on public.research_snapshots(owner_user_id);
create index if not exists research_snapshots_product_idx on public.research_snapshots(product, created_at desc);

alter table public.research_snapshots enable row level security;
-- No policy at all: not even the owner reads this from a browser. The only
-- access is service_role, which RLS does not apply to.

/*
 * Stores one de-identified copy, if and only if consent is currently on.
 *
 * The consent check is here rather than in the caller because a caller can be
 * wrong. Collection has exactly one door and the lock is on this side of it.
 */
create or replace function public.capture_research_snapshot(
  p_analysis_run_id uuid,
  p_owner_user_id uuid,
  p_consent_version text,
  p_product text,
  p_writing_mode text,
  p_editing_stance text,
  p_redacted_original text,
  p_redacted_revised text,
  p_redaction_summary jsonb,
  p_readiness_score integer,
  p_findings jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_research_consent(p_owner_user_id, p_consent_version) then
    return 'NO_CONSENT';
  end if;

  insert into public.research_snapshots (
    analysis_run_id, owner_user_id, product, writing_mode, editing_stance,
    redacted_original, redacted_revised, redaction_summary,
    readiness_score, findings, consent_version
  ) values (
    p_analysis_run_id, p_owner_user_id, p_product, p_writing_mode, p_editing_stance,
    left(p_redacted_original, 200000), left(p_redacted_revised, 200000),
    coalesce(p_redaction_summary, '{}'::jsonb),
    p_readiness_score, coalesce(p_findings, '[]'::jsonb), p_consent_version
  )
  on conflict (analysis_run_id) do update
    set redacted_original = excluded.redacted_original,
        redacted_revised = excluded.redacted_revised,
        redaction_summary = excluded.redaction_summary,
        readiness_score = excluded.readiness_score,
        findings = excluded.findings,
        consent_version = excluded.consent_version,
        created_at = timezone('utc', now());

  return 'CAPTURED';
end;
$$;

/*
 * Same signature as 20260824050000, with one addition: withdrawing consent
 * deletes what was already kept.
 *
 * "이후로는 활용하지 않습니다" is the weaker promise and the one most services
 * make. It leaves everything collected so far sitting there, which is not what
 * anyone means when they take permission back.
 */
create or replace function public.set_research_consent(p_granted boolean, p_consent_version text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  removed integer := 0;
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

  if not p_granted then
    delete from public.research_snapshots where owner_user_id = current_user_id;
    get diagnostics removed = row_count;
  end if;

  return jsonb_build_object('granted', p_granted, 'consentVersion', p_consent_version, 'deletedSnapshots', removed);
end;
$$;

revoke all on function public.capture_research_snapshot(uuid, uuid, text, text, text, text, text, text, jsonb, integer, jsonb) from public;
grant execute on function public.capture_research_snapshot(uuid, uuid, text, text, text, text, text, text, jsonb, integer, jsonb) to service_role;

commit;
