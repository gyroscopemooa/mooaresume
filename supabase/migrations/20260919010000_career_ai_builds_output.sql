-- AI 심층해설 결과를 내 기록에서 다시 볼 수 있게 저장한다.
--
-- 이전(20260912030000)에는 결과 텍스트를 저장하지 않고 응답과 함께 사라지게 했으나,
-- 결제한 결과가 새로고침·탭 종료로 사라지면 재결제 외에 방법이 없다는 문제가 있어
-- (사용자 요청 2026-09-19) 본인만 읽을 수 있게 저장한다. 읽기 정책은 기존
-- "members read own career ai builds"(본인 행만)가 그대로 적용된다. 쓰기는 서버(service role)만 한다.
-- 결과에는 이력서·자소서에서 인용한 문장이 일부 섞일 수 있다.

begin;

alter table public.career_ai_builds add column if not exists output jsonb;

commit;
