begin;

-- Only normalized, non-identifying tags are added. The redacted prose remains
-- behind the existing consent and service-role boundary.
alter table public.research_snapshots
  add column if not exists taxonomy_version text not null default '1.0',
  add column if not exists industry_tags jsonb not null default '[]'::jsonb check (jsonb_typeof(industry_tags) = 'array'),
  add column if not exists role_group text not null default '기타·미분류' check (char_length(role_group) <= 80),
  add column if not exists career_stage text not null default '미분류' check (career_stage in ('신입', '경력', '미분류')),
  add column if not exists experience_topics jsonb not null default '[]'::jsonb check (jsonb_typeof(experience_topics) = 'array'),
  add column if not exists improvement_types jsonb not null default '[]'::jsonb check (jsonb_typeof(improvement_types) = 'array');

create index if not exists research_snapshots_role_group_idx on public.research_snapshots(role_group, created_at desc);
create index if not exists research_snapshots_career_stage_idx on public.research_snapshots(career_stage, created_at desc);

-- Submission time is immutable once first observed. Follow-up dates make the
-- 14/28 day question deterministic without sending unsolicited mail.
alter table public.application_outcomes
  add column if not exists submitted_at timestamptz,
  add column if not exists followup_due_at timestamptz,
  add column if not exists followup_final_at timestamptz;

create index if not exists application_outcomes_followup_idx
  on public.application_outcomes(followup_due_at, status)
  where status in ('SUBMITTED', 'RESULT_PENDING', 'UNKNOWN');

-- PostgreSQL overloads functions by argument types. Remove the previous
-- 13-argument version so there is one canonical capture path after rollout.
drop function if exists public.capture_research_snapshot(uuid, uuid, text, text, text, text, text, text, jsonb, integer, jsonb, text, text);

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
  p_target_role text default null,
  p_taxonomy_version text default '1.0',
  p_industry_tags jsonb default '[]'::jsonb,
  p_role_group text default '기타·미분류',
  p_career_stage text default '미분류',
  p_experience_topics jsonb default '[]'::jsonb,
  p_improvement_types jsonb default '[]'::jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_research_consent(p_owner_user_id, p_consent_version) then return 'NO_CONSENT'; end if;

  insert into public.research_snapshots (
    analysis_run_id, owner_user_id, product, writing_mode, editing_stance,
    redacted_original, redacted_revised, redaction_summary, readiness_score, findings,
    consent_version, target_company, target_role, taxonomy_version, industry_tags,
    role_group, career_stage, experience_topics, improvement_types
  ) values (
    p_analysis_run_id, p_owner_user_id, p_product, p_writing_mode, p_editing_stance,
    left(p_redacted_original, 200000), left(p_redacted_revised, 200000),
    coalesce(p_redaction_summary, '{}'::jsonb), p_readiness_score, coalesce(p_findings, '[]'::jsonb),
    p_consent_version, nullif(btrim(coalesce(p_target_company, '')), ''), nullif(btrim(coalesce(p_target_role, '')), ''),
    p_taxonomy_version, coalesce(p_industry_tags, '[]'::jsonb), coalesce(nullif(btrim(p_role_group), ''), '기타·미분류'),
    coalesce(nullif(btrim(p_career_stage), ''), '미분류'), coalesce(p_experience_topics, '[]'::jsonb),
    coalesce(p_improvement_types, '[]'::jsonb)
  )
  on conflict (analysis_run_id) do update set
    redacted_original = excluded.redacted_original, redacted_revised = excluded.redacted_revised,
    redaction_summary = excluded.redaction_summary, readiness_score = excluded.readiness_score,
    findings = excluded.findings, consent_version = excluded.consent_version,
    target_company = excluded.target_company, target_role = excluded.target_role,
    taxonomy_version = excluded.taxonomy_version, industry_tags = excluded.industry_tags,
    role_group = excluded.role_group, career_stage = excluded.career_stage,
    experience_topics = excluded.experience_topics, improvement_types = excluded.improvement_types,
    created_at = timezone('utc', now());
  return 'CAPTURED';
end;
$$;

create or replace view public.research_corpus with (security_invoker = true) as
select rs.id, rs.product, rs.writing_mode, rs.editing_stance, rs.target_company, rs.target_role,
  rs.readiness_score, rs.findings, rs.redaction_summary, rs.created_at,
  rs.taxonomy_version, rs.industry_tags, rs.role_group, rs.career_stage,
  rs.experience_topics, rs.improvement_types, ar.application_case_id,
  ao.status as outcome_status, ao.confidence as outcome_confidence,
  ao.submitted_at, ao.followup_due_at, ao.followup_final_at, ao.updated_at as outcome_updated_at
from public.research_snapshots rs
join public.analysis_runs ar on ar.id = rs.analysis_run_id
left join public.application_outcomes ao on ao.application_case_id = ar.application_case_id;

-- Preserve the reward behavior while recording the first real submission and
-- its two gentle follow-up dates.
create or replace function public.record_application_outcome(p_application_case_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  case_owner_id uuid;
  existing public.application_outcomes%rowtype;
  analysed boolean;
  credit_id uuid := null;
  reporter_email text;
  first_submitted_at timestamptz;
begin
  if current_user_id is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501'; end if;
  select owner_user_id into case_owner_id from public.application_cases where id = p_application_case_id;
  if case_owner_id is null or case_owner_id <> current_user_id then raise exception 'APPLICATION_CASE_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into existing from public.application_outcomes where application_case_id = p_application_case_id for update;
  first_submitted_at := existing.submitted_at;
  if p_status in ('SUBMITTED', 'RESULT_PENDING') and first_submitted_at is null then first_submitted_at := timezone('utc', now()); end if;

  insert into public.application_outcomes (
    application_case_id, owner_user_id, status, submitted_at, followup_due_at, followup_final_at
  ) values (
    p_application_case_id, current_user_id, p_status, first_submitted_at,
    case when first_submitted_at is null then null else first_submitted_at + interval '14 days' end,
    case when first_submitted_at is null then null else first_submitted_at + interval '28 days' end
  ) on conflict (application_case_id) do update set
    status = excluded.status, submitted_at = coalesce(public.application_outcomes.submitted_at, excluded.submitted_at),
    followup_due_at = coalesce(public.application_outcomes.followup_due_at, excluded.followup_due_at),
    followup_final_at = coalesce(public.application_outcomes.followup_final_at, excluded.followup_final_at),
    occurred_at = timezone('utc', now()), updated_at = timezone('utc', now());

  if p_status not in ('DOCUMENT_PASS','DOCUMENT_FAIL','INTERVIEW_1_PASS','INTERVIEW_1_FAIL','FINAL_PASS','FINAL_FAIL') then
    return jsonb_build_object('status', p_status, 'rewardGranted', false, 'reason', 'NOT_SETTLED');
  end if;
  if existing.reward_credit_id is not null then return jsonb_build_object('status', p_status, 'rewardGranted', false, 'reason', 'ALREADY_REWARDED'); end if;
  select exists(select 1 from public.analysis_runs where application_case_id = p_application_case_id and owner_user_id = current_user_id and status = 'COMPLETED') into analysed;
  if not analysed then return jsonb_build_object('status', p_status, 'rewardGranted', false, 'reason', 'NO_COMPLETED_ANALYSIS'); end if;
  select email into reporter_email from auth.users where id = current_user_id;
  insert into public.reward_credits (product, reason, note, recipient_email, owner_user_id, claim_token, status, allowed_characters, claimed_at)
  values ('QUICK','OUTCOME_REPORT','지원 결과 보고 감사 · ' || p_status,coalesce(reporter_email,'unknown@mooaresume.com'),current_user_id,
    translate(encode(extensions.gen_random_bytes(24),'base64'),'+/=','-_'),'AVAILABLE',20000,timezone('utc',now())) returning id into credit_id;
  update public.application_outcomes set reward_credit_id = credit_id where application_case_id = p_application_case_id;
  return jsonb_build_object('status', p_status, 'rewardGranted', true, 'product', 'QUICK');
end;
$$;

revoke all on function public.capture_research_snapshot(uuid,uuid,text,text,text,text,text,text,jsonb,integer,jsonb,text,text,text,jsonb,text,text,jsonb,jsonb) from public;
grant execute on function public.capture_research_snapshot(uuid,uuid,text,text,text,text,text,text,jsonb,integer,jsonb,text,text,text,jsonb,text,text,jsonb,jsonb) to service_role;
revoke all on public.research_corpus from public, authenticated;
revoke all on function public.record_application_outcome(uuid,text) from public;
grant execute on function public.record_application_outcome(uuid,text) to authenticated;

commit;

