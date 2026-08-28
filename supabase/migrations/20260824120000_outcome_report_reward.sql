begin;

/*
 * 결과 보고 보상 — a free QUICK credit for telling us where an application
 * ended up.
 *
 * Why this exists: 자소서 첨삭 is an embarrassing purchase. Nobody who gets
 * hired posts "AI가 고쳐줬어요", so the category has almost no reviews and
 * every service is reduced to describing itself. Outcomes are the one form of
 * proof that cannot be written by the seller — and they are also the only
 * signal that tells us whether our editing rules actually work.
 *
 * The single decision that makes or breaks this: **the credit is paid for
 * reporting, not for passing.** 탈락 report earns exactly what 합격 report
 * earns. Pay only for good news and within a week the numbers say 90% pass,
 * which is worth less than no numbers at all — it would be a lie on our own
 * landing page and a lie in our own training signal.
 */

-- A new reason rather than a new table. Same argument as the original: every
-- future source is a value here.
alter table public.reward_credits drop constraint reward_credits_reason_check;
alter table public.reward_credits add constraint reward_credits_reason_check
  check (reason in ('LAUNCH_EVENT', 'REFERRAL', 'SNS', 'CS', 'MANUAL', 'OUTCOME_REPORT'));

-- One credit per application, enforced by the database rather than by the
-- screen. Someone will press the button twice, and someone else will press it
-- from a script.
alter table public.application_outcomes
  add column reward_credit_id uuid unique references public.reward_credits(id) on delete set null;

/*
 * Records an outcome and, the first time that application reaches a settled
 * result, issues the thank-you credit.
 *
 * Replaces 20260824070000's version. The recording half is unchanged; the
 * reward half is new, and it runs in the same transaction so a granted credit
 * and a recorded outcome cannot disagree.
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
  existing public.application_outcomes%rowtype;
  analysed boolean;
  credit_id uuid := null;
  reporter_email text;
  granted boolean := false;
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

  select * into existing from public.application_outcomes
  where application_case_id = p_application_case_id
  for update;

  insert into public.application_outcomes (application_case_id, owner_user_id, status)
  values (p_application_case_id, current_user_id, p_status)
  on conflict (application_case_id) do update
    set status = excluded.status,
        occurred_at = timezone('utc', now()),
        updated_at = timezone('utc', now());

  -- Settled results only. 결과 대기 is not a report; it is a promise to report
  -- later, and paying for it means paying twice for one application.
  --
  -- 합격 and 탈락 are deliberately in the same list.
  if p_status not in (
    'DOCUMENT_PASS', 'DOCUMENT_FAIL',
    'INTERVIEW_1_PASS', 'INTERVIEW_1_FAIL',
    'FINAL_PASS', 'FINAL_FAIL'
  ) then
    return jsonb_build_object('status', p_status, 'rewardGranted', false, 'reason', 'NOT_SETTLED');
  end if;

  if existing.reward_credit_id is not null then
    return jsonb_build_object('status', p_status, 'rewardGranted', false, 'reason', 'ALREADY_REWARDED');
  end if;

  -- An application we never analysed teaches us nothing, and without this an
  -- empty case is a free credit in two clicks, repeatable forever.
  select exists (
    select 1 from public.analysis_runs
    where application_case_id = p_application_case_id
      and owner_user_id = current_user_id
      and status = 'COMPLETED'
  ) into analysed;

  if not analysed then
    return jsonb_build_object('status', p_status, 'rewardGranted', false, 'reason', 'NO_COMPLETED_ANALYSIS');
  end if;

  select email into reporter_email from auth.users where id = current_user_id;

  -- QUICK, not the tier they bought. This is a thank-you and a reason to come
  -- back with the next application, not a refund of what they paid.
  --
  -- Arrives already claimed: they are signed in, so there is nobody to mail a
  -- link to. The token is still generated because the column is shared with
  -- mailed credits and a real value keeps the table uniform.
  insert into public.reward_credits (
    product, reason, note, recipient_email, owner_user_id, claim_token,
    status, allowed_characters, claimed_at
  ) values (
    'QUICK', 'OUTCOME_REPORT',
    '지원 결과 보고 감사 · ' || p_status,
    coalesce(reporter_email, 'unknown@mooaresume.com'), current_user_id,
    translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_'),
    'AVAILABLE', 20000, timezone('utc', now())
  ) returning id into credit_id;

  update public.application_outcomes
  set reward_credit_id = credit_id
  where application_case_id = p_application_case_id;

  granted := true;
  return jsonb_build_object('status', p_status, 'rewardGranted', granted, 'product', 'QUICK');
end;
$$;

revoke all on function public.record_application_outcome(uuid, text) from public;
grant execute on function public.record_application_outcome(uuid, text) to authenticated;

commit;
