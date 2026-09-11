-- 무료 재시도를 "합쳐서 N번"에서 "처음부터 다시 / 약점만 다시 각각 1번
-- 무료"로 바꾸고, 그 이후엔 3,000원짜리 재시도를 결제로 살 수 있게 한다.
--
-- billing_orders/analysis_entitlements(QUICK/PRO/FINAL 전용, begin_quick_analysis가
-- 소비하는 표)는 건드리지 않는다 — 이 결제는 그 소비 흐름과 무관한 완전히
-- 별개의 작은 상품이라, 기존 표의 CHECK 제약을 넓히는 대신 독립된 표 두 개를
-- 새로 둔다.

begin;

create table public.interview_entitlements (
  analysis_run_id uuid primary key references public.analysis_runs(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  restart_free_used boolean not null default false,
  weak_retry_free_used boolean not null default false,
  paid_extra_sessions integer not null default 0 check (paid_extra_sessions >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger interview_entitlements_updated_at before update on public.interview_entitlements
for each row execute function public.set_updated_at();

alter table public.interview_entitlements enable row level security;
create policy "interview entitlement owner read" on public.interview_entitlements for select to authenticated
  using ((select auth.uid()) = owner_user_id);

create type public.interview_retry_order_status as enum ('PAID');

create table public.interview_retry_orders (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('POLAR', 'GOOGLE_PLAY')),
  provider_order_id text not null,
  amount integer not null check (amount >= 0),
  currency text not null check (char_length(currency) = 3),
  status public.interview_retry_order_status not null default 'PAID',
  paid_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (provider, provider_order_id)
);

alter table public.interview_retry_orders enable row level security;
create policy "interview retry order owner read" on public.interview_retry_orders for select to authenticated
  using ((select auth.uid()) = owner_user_id);

/*
 * Same shape as before, but the old flat "3 sessions total" cap is replaced
 * with per-type free-once tracking: the very first session (whichever type)
 * is always free (it's what FINAL already paid for). Every session after
 * that draws first on that type's one free retry, then on paid_extra_sessions,
 * then refuses with PAYMENT_REQUIRED.
 */
create or replace function public.begin_interview_session(
  p_analysis_run_id uuid,
  p_focus_question_ids text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_run public.analysis_runs%rowtype;
  existing_session public.interview_sessions%rowtype;
  entitlement public.interview_entitlements%rowtype;
  is_first_session boolean;
  all_seed jsonb;
  seed jsonb;
  new_session_id uuid;
  first_question text;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select * into target_run from public.analysis_runs
  where id = p_analysis_run_id and owner_user_id = current_user_id;

  if target_run.id is null then
    raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_run.product <> 'FINAL' or target_run.status <> 'COMPLETED' then
    raise exception 'INTERVIEW_NOT_AVAILABLE' using errcode = '55000';
  end if;

  if p_focus_question_ids is null then
    select * into existing_session from public.interview_sessions
    where analysis_run_id = p_analysis_run_id and owner_user_id = current_user_id and status = 'ACTIVE'
    order by created_at desc limit 1;

    if existing_session.id is not null then
      return jsonb_build_object(
        'sessionId', existing_session.id,
        'maxTurns', existing_session.max_turns,
        'turnsUsed', existing_session.turns_used,
        'seedQuestions', existing_session.seed_questions,
        'pendingQuestion', existing_session.pending_question
      );
    end if;
  end if;

  select not exists(
    select 1 from public.interview_sessions
    where analysis_run_id = p_analysis_run_id and owner_user_id = current_user_id
  ) into is_first_session;

  if not is_first_session then
    insert into public.interview_entitlements (analysis_run_id, owner_user_id)
    values (p_analysis_run_id, current_user_id)
    on conflict (analysis_run_id) do nothing;

    select * into entitlement from public.interview_entitlements
    where analysis_run_id = p_analysis_run_id and owner_user_id = current_user_id
    for update;

    if p_focus_question_ids is null then
      if not entitlement.restart_free_used then
        update public.interview_entitlements set restart_free_used = true
        where analysis_run_id = p_analysis_run_id;
      elsif entitlement.paid_extra_sessions > 0 then
        update public.interview_entitlements set paid_extra_sessions = paid_extra_sessions - 1
        where analysis_run_id = p_analysis_run_id;
      else
        raise exception 'PAYMENT_REQUIRED' using errcode = '55000';
      end if;
    else
      if not entitlement.weak_retry_free_used then
        update public.interview_entitlements set weak_retry_free_used = true
        where analysis_run_id = p_analysis_run_id;
      elsif entitlement.paid_extra_sessions > 0 then
        update public.interview_entitlements set paid_extra_sessions = paid_extra_sessions - 1
        where analysis_run_id = p_analysis_run_id;
      else
        raise exception 'PAYMENT_REQUIRED' using errcode = '55000';
      end if;
    end if;
  end if;

  select coalesce(r.result_data->'interviewQuestions', '[]'::jsonb) into all_seed
  from public.analysis_results r
  where r.analysis_run_id = p_analysis_run_id;

  if p_focus_question_ids is null then
    seed := all_seed;
  else
    select coalesce(jsonb_agg(item), '[]'::jsonb) into seed
    from jsonb_array_elements(all_seed) item
    where item->>'id' = any (p_focus_question_ids);
  end if;

  if seed is null or jsonb_array_length(seed) = 0 then
    raise exception 'NO_SEED_QUESTIONS' using errcode = '55000';
  end if;

  first_question := seed->0->>'question';

  insert into public.interview_sessions (
    analysis_run_id, owner_user_id, status, max_turns, turns_used, seed_questions, pending_question, schema_version
  ) values (
    p_analysis_run_id, current_user_id, 'ACTIVE', least(5, jsonb_array_length(seed) + 2), 0, seed, first_question, '1.0'
  ) returning id into new_session_id;

  return jsonb_build_object(
    'sessionId', new_session_id,
    'maxTurns', least(5, jsonb_array_length(seed) + 2),
    'turnsUsed', 0,
    'seedQuestions', seed,
    'pendingQuestion', first_question
  );
end;
$$;

/*
 * 검증된 3,000원 재시도 결제를 +1 크레딧으로 기록한다. Polar 확인
 * (checkouts.get 폴링) 이나 Google Play 검증이 끝난 뒤 서버에서만 부른다 —
 * 클라이언트가 직접 호출하지 못하게 service_role 전용.
 */
create or replace function public.grant_interview_retry(
  p_analysis_run_id uuid,
  p_provider text,
  p_provider_order_id text,
  p_amount integer,
  p_currency text,
  p_paid_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  case_owner_id uuid;
  order_id uuid;
begin
  if p_provider not in ('POLAR', 'GOOGLE_PLAY') or p_amount < 0 then
    raise exception 'INVALID_RETRY_ORDER_INPUT' using errcode = '22023';
  end if;

  select owner_user_id into case_owner_id from public.analysis_runs where id = p_analysis_run_id;
  if case_owner_id is null then
    raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.interview_retry_orders (
    analysis_run_id, owner_user_id, provider, provider_order_id, amount, currency, paid_at
  ) values (
    p_analysis_run_id, case_owner_id, p_provider, p_provider_order_id, p_amount, lower(p_currency), p_paid_at
  ) on conflict (provider, provider_order_id) do nothing
  returning id into order_id;

  if order_id is null then
    return 'DUPLICATE_ORDER';
  end if;

  insert into public.interview_entitlements (analysis_run_id, owner_user_id, paid_extra_sessions)
  values (p_analysis_run_id, case_owner_id, 1)
  on conflict (analysis_run_id) do update
    set paid_extra_sessions = public.interview_entitlements.paid_extra_sessions + 1;

  return 'GRANTED';
end;
$$;

revoke all on function public.grant_interview_retry(uuid, text, text, integer, text, timestamptz) from public;
grant execute on function public.grant_interview_retry(uuid, text, text, integer, text, timestamptz) to service_role;

commit;
