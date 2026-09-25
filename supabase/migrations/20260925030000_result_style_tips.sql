begin;

-- 최종 첨삭본 "선택 제안" 카드의 컨설턴트식 설명.
--
-- 무엇을 제안할지는 화면 규칙이 정하고, 이 표에는 그 자리에 대해 모델이 한 번 쓴 설명만 둡니다.
-- 한 번 쓴 설명은 바꾸지 않습니다 — 같은 결과를 다른 기기에서 다시 열어도, 다시 열 때마다
-- 문구가 달라지는 일이 없어야 하기 때문입니다. 그래서 수정·삭제 정책이 없습니다.
--
-- 첨삭 결과(`analysis_results`)는 건드리지 않습니다. 이 표가 없어도 카드는 고정 문구로 동작하고,
-- 표가 있으면 설명을 여기서 읽고 씁니다.
create table if not exists public.result_style_tips (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null check (char_length(question_id) between 1 and 120),
  -- 제안의 종류. 지금은 접속어로 시작하는 한 줄 문단 붙이기 하나뿐입니다.
  kind text not null default 'connector_merge' check (kind in ('connector_merge')),
  -- 그 한 줄과 바로 뒤 문단 글의 해시. 지원자가 글을 고쳐 제안 자리가 바뀌면 다른 키가 되어
  -- 예전 설명을 엉뚱한 글에 붙이지 않습니다.
  tip_key text not null check (char_length(tip_key) between 8 and 64),
  explanation text not null check (char_length(explanation) between 20 and 220),
  created_at timestamptz not null default timezone('utc', now()),
  unique (analysis_run_id, question_id, kind, tip_key)
);

alter table public.result_style_tips enable row level security;

-- 자기 것만 읽습니다. 자기소개서 내용이 담긴 설명입니다.
drop policy if exists "style tip owner read" on public.result_style_tips;
create policy "style tip owner read" on public.result_style_tips
  for select to authenticated
  using ((select auth.uid()) = owner_user_id);

-- 자기 결과에 대해서만 넣을 수 있습니다. 서버 경로가 로그인한 사용자 권한으로 저장하므로 넣기 정책이
-- 필요하고, 남의 결과에는 넣을 수 없게 소유자를 함께 확인합니다.
drop policy if exists "style tip owner insert" on public.result_style_tips;
create policy "style tip owner insert" on public.result_style_tips
  for insert to authenticated
  with check (
    (select auth.uid()) = owner_user_id
    and exists (
      select 1 from public.analysis_runs run
      where run.id = analysis_run_id and run.owner_user_id = (select auth.uid())
    )
  );

create index if not exists result_style_tips_owner_idx
  on public.result_style_tips (owner_user_id, created_at desc);

commit;
