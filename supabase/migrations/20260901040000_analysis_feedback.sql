/*
 * 분석을 받아 본 사람이 남기는 한 장짜리 후기.
 *
 * 완료 메일에서 들어옵니다. 묻는 것은 셋뿐입니다 — 별점, 도움이 된 점,
 * 더 있었으면 하는 것. "무엇이 불만인가"를 묻지 않는 이유가 있습니다:
 * "별로였다"는 답은 다음에 할 일을 알려주지 않고, 답한 사람도 답을 받지
 * 못합니다. 반면 "다음에 이런 게 있었으면"은 그대로 할 일 목록이 됩니다.
 */
create table if not exists public.analysis_feedback (
  id uuid primary key default extensions.gen_random_uuid(),

  -- 어느 분석에 대한 후기인가. 한 분석에 한 장만 받습니다 — 같은 사람이
  -- 열 번 보내면 별점 평균이 그 사람의 기분이 됩니다.
  analysis_run_id uuid not null unique references public.analysis_runs(id) on delete cascade,

  -- 후기를 남긴 계정. 메일 링크는 로그인 없이도 열리므로 비어 있을 수 있고,
  -- 비어 있다고 후기를 버리지는 않습니다.
  user_id uuid references auth.users(id) on delete set null,

  rating smallint not null check (rating between 1 and 5),
  helpful_text text,
  wish_text text,

  -- 읽음 표시. 관리자 메뉴의 숫자가 "아직 안 본 것"을 세야 하는데, 그 기준이
  -- 없으면 배지가 총 개수를 세다가 영원히 줄지 않습니다.
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists analysis_feedback_created_idx
  on public.analysis_feedback (created_at desc);
create index if not exists analysis_feedback_unread_idx
  on public.analysis_feedback (created_at desc) where read_at is null;

/*
 * 브라우저에서 직접 넣지 못하게 합니다.
 *
 * 후기는 서버 라우트가 서비스 키로 씁니다. 그쪽에서 "그 분석이 실제로
 * 있는가", "이미 한 장 있지 않은가"를 확인하기 때문입니다. 클라이언트에
 * insert를 열어 두면 그 확인을 건너뛴 채로 아무 값이나 들어옵니다.
 */
alter table public.analysis_feedback enable row level security;

-- 읽기도 열지 않습니다. 이 표를 볼 사람은 관리자뿐이고, 관리자 화면은
-- 서비스 키로 읽습니다.
drop policy if exists "analysis feedback no client access" on public.analysis_feedback;
