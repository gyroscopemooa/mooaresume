-- 커뮤니티 마이그레이션이 쓰는 공용 트리거 함수입니다. 무아레주메에서는
-- 다른 마이그레이션(20260815120000_mvp_application_foundation.sql)이 이미
-- 만들어 뒀지만, 새 프로젝트에는 없을 수 있으므로 커뮤니티 마이그레이션보다
-- 먼저 한 번 실행하세요. 이미 있으면 그대로 두고 넘어갑니다.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
