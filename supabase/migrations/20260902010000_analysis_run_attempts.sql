/*
 * 시도 한 번에 한 줄.
 *
 * ------------------------------------------------------------------
 * 왜 표를 따로 만드는가
 * ------------------------------------------------------------------
 * `analysis_runs`에도 토큰 칸이 있습니다. 그런데 그 칸은 재시도가 있을 때
 * **덮어써집니다** — `complete_quick_analysis`가 성공한 시도의 값으로 갱신하기
 * 때문입니다. 게다가 `fail_quick_analysis`는 토큰을 아예 적지 않습니다.
 *
 * 그 결과 지금까지 이런 일이 보이지 않았습니다: 모델이 응답을 끝까지 만들어
 * 냈는데 검증에서 걸려 버려진 경우. **요금은 다 나갔는데 기록은 0입니다.**
 * 한 건에 실제로 얼마가 들었는지 물으면 답할 수 없었습니다.
 *
 * 한 줄짜리 원장을 따로 두면 덮어쓸 일이 없고, 시도마다 얼마가 나갔는지가
 * 그대로 남습니다.
 *
 * ------------------------------------------------------------------
 * 지우지 않습니다
 * ------------------------------------------------------------------
 * 분석이 지워지면 같이 지워지지만(on delete cascade), 그 외에는 갱신도
 * 삭제도 하지 않는 추가 전용 표입니다. 원가 기록을 나중에 고칠 수 있으면
 * 그것은 이미 원가 기록이 아닙니다.
 */
create table if not exists public.analysis_run_attempts (
  id uuid primary key default extensions.gen_random_uuid(),

  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,

  -- 그 시점의 `analysis_runs.attempt_count`. 몇 번째 시도였는지를 나중에
  -- 세는 대신 적어 둡니다 — 세려면 순서를 믿어야 하는데, 브라우저와
  -- 스케줄러가 같은 분석을 동시에 건드릴 수 있습니다.
  attempt_no integer not null check (attempt_no >= 0),

  -- 이 시도가 어떻게 끝났는가. COMPLETED만 결과를 남기고, 나머지는 돈만
  -- 쓰고 버려진 것입니다.
  outcome text not null check (outcome in (
    'COMPLETED', 'VALIDATION_FAILED', 'QUESTION_MISSING', 'PROVIDER_FAILED', 'ERROR'
  )),
  failure_code text,

  -- 어디서 돌린 시도인가. 브라우저를 닫아 스케줄러가 대신 끝낸 건이 얼마나
  -- 되는지가 이 칸에만 남습니다.
  source text not null check (source in ('BROWSER', 'CRON')),

  model text,
  response_id text,

  -- 입력과 출력을 나눠 둡니다. 출력 단가가 입력의 몇 배라, 합계만 있으면
  -- 원가를 제대로 계산할 수 없습니다.
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),

  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists analysis_run_attempts_run_idx
  on public.analysis_run_attempts (analysis_run_id, created_at);
create index if not exists analysis_run_attempts_created_idx
  on public.analysis_run_attempts (created_at desc);

/*
 * 브라우저에서 쓰지도 읽지도 못하게 합니다.
 *
 * 쓰기: 이 줄은 서버가 OpenAI 응답을 받은 자리에서만 적습니다. 클라이언트에
 * 열어 두면 원가 장부에 아무 숫자나 들어옵니다.
 * 읽기: 볼 사람은 관리자뿐이고, 관리자 화면은 서비스 키로 읽습니다.
 */
alter table public.analysis_run_attempts enable row level security;

drop policy if exists "analysis run attempts no client access" on public.analysis_run_attempts;

revoke all on table public.analysis_run_attempts from anon, authenticated;
grant select, insert on table public.analysis_run_attempts to service_role;
