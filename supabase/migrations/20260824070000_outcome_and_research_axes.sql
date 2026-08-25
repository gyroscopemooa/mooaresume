-- Two corrections to what gets kept, both of which decide whether the stored
-- corpus can answer anything at all.
--
-- 1. The company and role applied to were left out of research_snapshots on
--    privacy grounds. That was the wrong call. The employer someone applies to
--    is not their employer — thousands apply to the same company — so it
--    identifies nobody, while it is the axis every useful question runs along:
--    "이 회사는 무엇을 중요하게 보나", "이 직무는 무엇이 있어야 하나". Without
--    it the corpus is a pile of anonymous prose with nothing to group by.
--
--    What actually narrows a person is the other direction — where they worked,
--    for how long, which school — and that lives in the prose, where the
--    redactor and the stated limits apply.
--
-- 2. The applicant already tells us the outcome. 서류 합격 / 서류 불합격 /
--    최종 합격 are buttons on the result screen, and every one of those clicks
--    has been written to sessionStorage and lost when the tab closed. So the
--    one thing that would let us say "합격한 지원서의 공통점" has never been
--    recorded at all.
--
-- Self-reported and unverified, and the column says so. Somebody claiming an
-- offer they did not get is a real possibility, and a corpus that pretends
-- otherwise draws confident conclusions from it.

begin;

alter table public.research_snapshots
  add column if not exists target_company text check (target_company is null or char_length(target_company) <= 120),
  add column if not exists target_role text check (target_role is null or char_length(target_role) <= 120);

create index if not exists research_snapshots_company_idx on public.research_snapshots(target_company, created_at desc);
create index if not exists research_snapshots_role_idx on public.research_snapshots(target_role, created_at desc);

create table public.application_outcomes (
  application_case_id uuid primary key references public.application_cases(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in (
    'NOT_SUBMITTED', 'SUBMITTED', 'RESULT_PENDING',
    'DOCUMENT_PASS', 'DOCUMENT_FAIL',
    'INTERVIEW_1_PENDING', 'INTERVIEW_1_PASS', 'INTERVIEW_1_FAIL',
    'FINAL_INTERVIEW_PENDING', 'FINAL_PASS', 'FINAL_FAIL',
    'WITHDRAWN', 'UNKNOWN'
  )),
  -- Never anything else, for now. Every value here comes from a button the
  -- applicant pressed about their own application, with nothing checked. The
  -- column exists so a later verified source cannot be silently mixed in with
  -- these.
  confidence text not null default 'SELF_REPORTED' check (confidence in ('SELF_REPORTED', 'FOLLOWUP_CONFIRMED', 'DOCUMENT_VERIFIED')),
  occurred_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index application_outcomes_status_idx on public.application_outcomes(status, updated_at desc);

alter table public.application_outcomes enable row level security;

create policy "application outcome owner read" on public.application_outcomes for select to authenticated
  using ((select auth.uid()) = owner_user_id);

/*
 * Records where an application ended up.
 *
 * Latest-wins rather than an event log: the applicant is describing one
 * application's current state, and they correct themselves ("아 최종은 다음
 * 주였네"). A log of every correction would need dedup on read for no gain.
 */
create or replace function public.record_application_outcome(p_application_case_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  case_owner_id uuid;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select owner_user_id into case_owner_id
  from public.application_cases
  where id = p_application_case_id;

  if case_owner_id is null or case_owner_id <> current_user_id then
    raise exception 'APPLICATION_CASE_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.application_outcomes (application_case_id, owner_user_id, status)
  values (p_application_case_id, current_user_id, p_status)
  on conflict (application_case_id) do update
    set status = excluded.status,
        occurred_at = timezone('utc', now()),
        updated_at = timezone('utc', now());

  return jsonb_build_object('status', p_status);
end;
$$;

/*
 * Same body as 20260824060000 with the two axes added.
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
  p_findings jsonb,
  p_target_company text default null,
  p_target_role text default null
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
    readiness_score, findings, consent_version, target_company, target_role
  ) values (
    p_analysis_run_id, p_owner_user_id, p_product, p_writing_mode, p_editing_stance,
    left(p_redacted_original, 200000), left(p_redacted_revised, 200000),
    coalesce(p_redaction_summary, '{}'::jsonb),
    p_readiness_score, coalesce(p_findings, '[]'::jsonb), p_consent_version,
    nullif(btrim(coalesce(p_target_company, '')), ''),
    nullif(btrim(coalesce(p_target_role, '')), '')
  )
  on conflict (analysis_run_id) do update
    set redacted_original = excluded.redacted_original,
        redacted_revised = excluded.redacted_revised,
        redaction_summary = excluded.redaction_summary,
        readiness_score = excluded.readiness_score,
        findings = excluded.findings,
        consent_version = excluded.consent_version,
        target_company = excluded.target_company,
        target_role = excluded.target_role,
        created_at = timezone('utc', now());

  return 'CAPTURED';
end;
$$;

/*
 * What the console reads: one row per stored application, with the outcome
 * joined on.
 *
 * A view rather than a copied column, because the outcome arrives weeks after
 * the snapshot and copying it would mean a second write path that can fall
 * behind. The join is by the run's case, which is how the two are actually
 * related.
 */
create or replace view public.research_corpus
with (security_invoker = true)
as
select
  rs.id,
  rs.product,
  rs.writing_mode,
  rs.editing_stance,
  rs.target_company,
  rs.target_role,
  rs.readiness_score,
  rs.findings,
  rs.redaction_summary,
  rs.created_at,
  ar.application_case_id,
  ao.status as outcome_status,
  ao.confidence as outcome_confidence,
  ao.updated_at as outcome_updated_at
from public.research_snapshots rs
join public.analysis_runs ar on ar.id = rs.analysis_run_id
left join public.application_outcomes ao on ao.application_case_id = ar.application_case_id;

revoke all on function public.record_application_outcome(uuid, text) from public;
grant execute on function public.record_application_outcome(uuid, text) to authenticated;
revoke all on function public.capture_research_snapshot(uuid, uuid, text, text, text, text, text, text, jsonb, integer, jsonb, text, text) from public;
grant execute on function public.capture_research_snapshot(uuid, uuid, text, text, text, text, text, text, jsonb, integer, jsonb, text, text) to service_role;
revoke all on public.research_corpus from public, authenticated;

commit;
