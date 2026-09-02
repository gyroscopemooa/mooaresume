begin;

-- 제출 전 보완.
--
-- FINAL이 "손님만 답을 안다"고 남긴 것들에 대해 손님이 사실을 알려 주면, 그
-- 문장만 다시 써서 여기에 쌓습니다.
--
-- 첨삭 결과(`analysis_results`)는 **건드리지 않습니다.** 덮어쓰면 원래 문장이
-- 사라져 되돌릴 수도, 무엇이 바뀌었는지 보여 줄 수도 없습니다. 손님이 보완을
-- 잘못했다고 느낄 때 돌아갈 자리가 있어야 합니다.
--
-- 분석 하나에 보완본 하나입니다. 다시 답하면 덮어씁니다 — 보완의 이력을
-- 쌓아 두는 것은 손님에게 아무 쓸모가 없고, 표만 커집니다.
create table if not exists public.final_submission_patches (
  analysis_run_id uuid primary key references public.analysis_runs(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  -- 손님이 답한 사실. 무엇을 근거로 문장을 고쳤는지 나중에 물어볼 수 있어야
  -- 합니다.
  answers jsonb not null default '[]'::jsonb check (jsonb_typeof(answers) = 'array'),
  -- 바꾼 문장들. before/after를 함께 두어야 "바뀐 곳만 보기"가 가능합니다.
  patches jsonb not null default '[]'::jsonb check (jsonb_typeof(patches) = 'array'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.final_submission_patches enable row level security;

-- 자기 것만 읽고 씁니다. 남의 자기소개서 보완본은 그 사람의 지원서 내용입니다.
drop policy if exists "final patch owner read" on public.final_submission_patches;
create policy "final patch owner read" on public.final_submission_patches
  for select to authenticated
  using ((select auth.uid()) = owner_user_id);

-- 쓰기는 서버만 합니다. 문장을 바꾸는 일은 모델을 거쳐야 하고, 브라우저가
-- 직접 넣을 수 있으면 아무 문장이나 "보완본"으로 저장할 수 있습니다.
drop policy if exists "final patch no client write" on public.final_submission_patches;

create index if not exists final_submission_patches_owner_idx
  on public.final_submission_patches (owner_user_id, updated_at desc);

commit;
