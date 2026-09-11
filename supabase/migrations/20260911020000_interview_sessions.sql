-- FINAL의 인터랙티브 모의면접.
--
-- 가격표(pricing-comparison.tsx)가 FINAL 전용으로 약속해 온 "인터랙티브 AI
-- 모의면접 · 답변 평가 · 동적 꼬리질문 · 최종 리포트"가 지금까지 코드에
-- 전혀 없었다(2026-08-24 change-log에 이미 기록된 채 방치된 불일치). 정적
-- interviewQuestions 목록(analysis_results.result_data)은 그대로 두고, 그
-- 위에 실제 턴 주고받기를 얹는다.
--
-- 이 테이블들은 MOOA_RESUME_PROJECT_SPEC.md §23의 "미래" 목록에 있던 것이지만,
-- FINAL이 이미 판매 중인 상품이고(20260824010000_enable_final_product.sql)
-- 가격표가 이미 이 기능을 약속하고 있으므로 지금 필요하다(AGENTS.md "future-only
-- empty tables" 경계에 대한 설명).
--
-- 비용 상한: 세션당 턴 수(max_turns, 기본 5)는 analysis_runs.attempt_count가
-- 쓰는 것과 같은 CHECK 제약 방식. 분석 실행 하나당 세션 개수도 3개로
-- 막는다(RPC 안에서) — FINAL 19,900원이 무제한 재시도를 감당하지 않는다.
--
-- 비용 기록은 analysis_run_attempts와 같은 이유로 별도 append-only 표
-- (interview_turn_attempts)에 남긴다 — 세션/턴 행은 재시도로 덮어써질 수
-- 있어도 원장은 그대로 남는다.

begin;

create type public.interview_session_status as enum ('ACTIVE', 'COMPLETED', 'ABANDONED');

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status public.interview_session_status not null default 'ACTIVE',
  max_turns integer not null default 5 check (max_turns between 1 and 8),
  turns_used integer not null default 0 check (turns_used >= 0),
  -- 세션 시작 시점의 interviewQuestions 스냅샷(또는 "약점만 다시 연습"일 때
  -- 그 중 골라낸 부분집합). 분석 결과가 나중에 바뀌어도 세션 안에서는
  -- 흔들리지 않는다.
  seed_questions jsonb not null check (jsonb_typeof(seed_questions) = 'array'),
  final_report jsonb,
  model text,
  prompt_version text,
  schema_version text not null default '1.0',
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (turns_used <= max_turns),
  check (status <> 'COMPLETED' or (completed_at is not null and final_report is not null))
);

create index interview_sessions_run_idx on public.interview_sessions(analysis_run_id, created_at desc);
create index interview_sessions_owner_idx on public.interview_sessions(owner_user_id, created_at desc);

create table public.interview_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  turn_no integer not null check (turn_no >= 1),
  question text not null check (char_length(question) between 1 and 2000),
  answer text not null check (char_length(answer) between 1 and 4000),
  -- { strengths: string[], gaps: string[], note: string } — 숫자 점수 없음
  -- (AGENTS.md: 합격확률·근거 없는 점수 금지).
  evaluation jsonb not null check (jsonb_typeof(evaluation) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (session_id, turn_no)
);

create index interview_turns_session_idx on public.interview_turns(session_id, turn_no);

-- analysis_run_attempts와 동일한 목적/동일한 잠금(같은 파일의 코멘트가
-- 이유를 설명한다): 클라이언트는 절대 읽거나 쓰지 못하고, 서버가 OpenAI
-- 응답을 받은 자리에서만 한 줄을 남긴다.
create table public.interview_turn_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  turn_no integer not null check (turn_no >= 1),
  outcome text not null check (outcome in ('COMPLETED', 'PROVIDER_FAILED', 'ERROR')),
  failure_code text,
  model text,
  response_id text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index interview_turn_attempts_session_idx on public.interview_turn_attempts(session_id, created_at);

alter table public.interview_sessions enable row level security;
alter table public.interview_turns enable row level security;
alter table public.interview_turn_attempts enable row level security;

-- 조회만 클라이언트에 열어 둔다. 쓰기는 전부 아래 security definer 함수를
-- 거친다 — 턴 예산(max_turns)을 원자적으로 지키려면 "확인 후 기록"이 한
-- 트랜잭션 안에서 락과 함께 일어나야 한다.
create policy "interview session owner read" on public.interview_sessions for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy "interview turn owner read" on public.interview_turns for select to authenticated
  using ((select auth.uid()) = owner_user_id);

revoke all on table public.interview_turn_attempts from anon, authenticated;
grant select, insert on table public.interview_turn_attempts to service_role;

/*
 * 모의면접 세션을 시작(또는 이미 진행 중인 것을 이어받음).
 *
 * p_focus_question_ids가 있으면 "약점만 다시 연습"이다 — 원래 interviewQuestions
 * 중 그 id들만 골라 seed_questions로 쓴다. 없으면 전체 목록을 쓴다.
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
  session_count integer;
  all_seed jsonb;
  seed jsonb;
  new_session_id uuid;
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

  -- 진행 중인 세션이 있으면(그리고 특정 질문만 다시 연습하려는 게 아니면)
  -- 새로 만들지 않고 그걸 돌려준다 — 새로고침 한 번이 새 세션·새 비용을
  -- 만들면 안 된다.
  if p_focus_question_ids is null then
    select * into existing_session from public.interview_sessions
    where analysis_run_id = p_analysis_run_id and owner_user_id = current_user_id and status = 'ACTIVE'
    order by created_at desc limit 1;

    if existing_session.id is not null then
      return jsonb_build_object(
        'sessionId', existing_session.id,
        'maxTurns', existing_session.max_turns,
        'turnsUsed', existing_session.turns_used,
        'seedQuestions', existing_session.seed_questions
      );
    end if;
  end if;

  select count(*) into session_count from public.interview_sessions
  where analysis_run_id = p_analysis_run_id and owner_user_id = current_user_id;

  if session_count >= 3 then
    raise exception 'SESSION_LIMIT_REACHED' using errcode = '55000';
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

  insert into public.interview_sessions (
    analysis_run_id, owner_user_id, status, max_turns, turns_used, seed_questions, schema_version
  ) values (
    p_analysis_run_id, current_user_id, 'ACTIVE', least(5, jsonb_array_length(seed) + 2), 0, seed, '1.0'
  ) returning id into new_session_id;

  return jsonb_build_object(
    'sessionId', new_session_id,
    'maxTurns', least(5, jsonb_array_length(seed) + 2),
    'turnsUsed', 0,
    'seedQuestions', seed
  );
end;
$$;

revoke all on function public.begin_interview_session(uuid, text[]) from public;
grant execute on function public.begin_interview_session(uuid, text[]) to authenticated;

/*
 * 턴 하나를 기록한다. 평가·다음 질문은 서버가 OpenAI 호출로 이미 만들어
 * 왔고, 이 함수는 그걸 원자적으로(락 + 재확인) 남기고 turns_used를 올린다.
 * 이미 쓴 턴 번호(p_turn_no)와 세션의 실제 turns_used가 어긋나면(동시 제출,
 * 재시도 등) 거절한다 — 겹쳐 쓰지 않는다.
 */
create or replace function public.record_interview_turn(
  p_session_id uuid,
  p_turn_no integer,
  p_question text,
  p_answer text,
  p_evaluation jsonb,
  p_model text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_session public.interview_sessions%rowtype;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select * into target_session from public.interview_sessions
  where id = p_session_id and owner_user_id = current_user_id
  for update;

  if target_session.id is null then
    raise exception 'INTERVIEW_SESSION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_session.status <> 'ACTIVE' then
    raise exception 'INTERVIEW_SESSION_NOT_ACTIVE' using errcode = '55000';
  end if;
  if target_session.turns_used >= target_session.max_turns then
    raise exception 'TURN_LIMIT_REACHED' using errcode = '55000';
  end if;
  if p_turn_no <> target_session.turns_used + 1 then
    raise exception 'TURN_OUT_OF_ORDER' using errcode = '55000';
  end if;

  insert into public.interview_turns (
    session_id, owner_user_id, turn_no, question, answer, evaluation
  ) values (
    p_session_id, current_user_id, p_turn_no, p_question, p_answer, p_evaluation
  );

  update public.interview_sessions
  set turns_used = turns_used + 1, model = coalesce(p_model, model)
  where id = p_session_id;

  return jsonb_build_object('turnsUsed', target_session.turns_used + 1, 'maxTurns', target_session.max_turns);
end;
$$;

revoke all on function public.record_interview_turn(uuid, integer, text, text, jsonb, text) from public;
grant execute on function public.record_interview_turn(uuid, integer, text, text, jsonb, text) to authenticated;

/*
 * 최종 리포트로 세션을 닫는다. 최소 한 턴은 있어야 한다 — 질문 하나에
 * 답하지 않은 세션에 리포트를 붙이면 근거 없는 요약이 된다.
 */
create or replace function public.finish_interview_session(
  p_session_id uuid,
  p_final_report jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_session public.interview_sessions%rowtype;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select * into target_session from public.interview_sessions
  where id = p_session_id and owner_user_id = current_user_id
  for update;

  if target_session.id is null then
    raise exception 'INTERVIEW_SESSION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_session.status <> 'ACTIVE' then
    raise exception 'INTERVIEW_SESSION_NOT_ACTIVE' using errcode = '55000';
  end if;
  if target_session.turns_used < 1 then
    raise exception 'NO_TURNS_RECORDED' using errcode = '55000';
  end if;

  update public.interview_sessions
  set status = 'COMPLETED', final_report = p_final_report, completed_at = timezone('utc', now())
  where id = p_session_id;

  return jsonb_build_object('status', 'COMPLETED');
end;
$$;

revoke all on function public.finish_interview_session(uuid, jsonb) from public;
grant execute on function public.finish_interview_session(uuid, jsonb) to authenticated;

commit;
