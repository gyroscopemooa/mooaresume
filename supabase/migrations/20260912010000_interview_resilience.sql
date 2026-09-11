-- 모의면접 두 가지 보완.
--
-- 1) 진행 중 세션 복원: 다른 페이지에 갔다가 돌아오면 지금 물어야 할 질문이
--    어디에도 저장돼 있지 않아 처음 질문부터 다시 보여줬다 — 이미 답한
--    질문을 다시 답하면 그게 새 턴으로 기록되어 턴 예산(최대 5)을 헛되이
--    소모한다. AI가 만든 "다음 질문"을 세션에 저장해 두고 재개 시 그대로
--    돌려준다.
-- 2) 같은 턴이 계속 실패할 때의 상한: 지금은 실패하면 사용자가 무한정 다시
--    누를 수 있고, 실패한 시도도 비용은 나간다(interview_turn_attempts에
--    이미 기록됨). 같은 턴이 3번 실패하면 더 시도하지 않고 지금까지 답한
--    턴만으로 마무리하도록 한다.

begin;

alter table public.interview_sessions
  add column pending_question text,
  add column turn_failure_count integer not null default 0 check (turn_failure_count between 0 and 3);

-- Same body as the original, plus: sets/returns pending_question on both the
-- new-session and resumed-session paths.
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

-- Same body as the original, plus: accepts the next question the caller
-- already generated and stores it, and resets turn_failure_count — a
-- successful turn forgives whatever failed before it.
create or replace function public.record_interview_turn(
  p_session_id uuid,
  p_turn_no integer,
  p_question text,
  p_answer text,
  p_evaluation jsonb,
  p_next_question text default null,
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
  set turns_used = turns_used + 1,
      model = coalesce(p_model, model),
      pending_question = coalesce(p_next_question, pending_question),
      turn_failure_count = 0
  where id = p_session_id;

  return jsonb_build_object('turnsUsed', target_session.turns_used + 1, 'maxTurns', target_session.max_turns);
end;
$$;

revoke all on function public.record_interview_turn(uuid, integer, text, text, jsonb, text, text) from public;
grant execute on function public.record_interview_turn(uuid, integer, text, text, jsonb, text, text) to authenticated;

-- The old 6-arg signature is gone (schema changed under it, not just an
-- overload) — drop it explicitly so two versions don't sit side by side.
drop function if exists public.record_interview_turn(uuid, integer, text, text, jsonb, text);

/*
 * 같은 턴이 실패했다고 기록한다(AI 호출 자체가 실패한 경우 — 검증 실패나
 * 네트워크 오류). 3번째 실패를 반환하면 호출자(라우트)는 더 시도하지 않고
 * 지금까지의 턴만으로 마무리하도록 유도한다.
 */
create or replace function public.record_interview_turn_failure(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_count integer;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  update public.interview_sessions
  set turn_failure_count = least(turn_failure_count + 1, 3)
  where id = p_session_id and owner_user_id = current_user_id and status = 'ACTIVE'
  returning turn_failure_count into new_count;

  if new_count is null then
    raise exception 'INTERVIEW_SESSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  return new_count;
end;
$$;

revoke all on function public.record_interview_turn_failure(uuid) from public;
grant execute on function public.record_interview_turn_failure(uuid) to authenticated;

commit;
