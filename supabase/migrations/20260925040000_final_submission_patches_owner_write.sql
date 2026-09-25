begin;

-- final_submission_patches 쓰기 정책 보완.
--
-- 20260902020000_final_submission_patch.sql은 읽기 정책만 만들고, 쓰기는 "서버만 한다"는 뜻으로 정책을
-- 두지 않았습니다. 그런데 이 코드베이스에는 서비스 키로 붙는 서버 클라이언트가 없어서 `/api/final-patch`도
-- 로그인한 사용자 권한으로 upsert합니다. RLS에 쓰기 정책이 하나도 없으면 그 upsert는 매번 거절되어,
-- 화면에 "고쳤지만 저장하지 못했습니다"가 뜨고 보완본이 저장되지 않았습니다.
--
-- 자기 분석 실행(analysis_run)의 행만 넣고 고칠 수 있게 합니다. upsert는 넣기와 고치기가 모두 필요합니다.
-- 남의 실행에는 쓸 수 없고, 삭제 정책은 두지 않습니다(분석 실행이 지워지면 함께 지워집니다).
--
-- 알아 둘 점: 원래 주석의 "브라우저가 직접 넣을 수 있으면 아무 문장이나 보완본으로 저장할 수 있다"는 우려는
-- 이 정책으로 다시 열립니다. 다만 서버도 같은 사용자 권한으로 쓰므로 서버만 쓰게 강제할 방법이 없었고,
-- 쓴 사람과 읽는 사람이 같은 본인뿐이라 다른 사람에게 영향이 없습니다. 이 표는 현재 읽는 코드도 없습니다.
drop policy if exists "final patch owner insert" on public.final_submission_patches;
create policy "final patch owner insert" on public.final_submission_patches
  for insert to authenticated
  with check (
    (select auth.uid()) = owner_user_id
    and exists (
      select 1 from public.analysis_runs run
      where run.id = analysis_run_id and run.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "final patch owner update" on public.final_submission_patches;
create policy "final patch owner update" on public.final_submission_patches
  for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check (
    (select auth.uid()) = owner_user_id
    and exists (
      select 1 from public.analysis_runs run
      where run.id = analysis_run_id and run.owner_user_id = (select auth.uid())
    )
  );

commit;
