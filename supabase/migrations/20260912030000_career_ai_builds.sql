-- AI 심층해설(커리어 검사) 1건을 사고 쓰는 기록.
--
-- career_description_builds(20260906213838)와 같은 "1건 사서 1건 만든다" 모양을
-- 그대로 따릅니다. 검사 점수는 이미 career_assessment_results에 저장돼 있어 이
-- 표에는 담지 않고, 어떤 범위(scope)를 샀는지만 남깁니다. 실행 시점에 서버가
-- 본인 소유의 최신 검사 결과를 직접 읽어 해설을 만들고, 결과 텍스트는 여기
-- 저장하지 않습니다 — 응답과 함께 사라집니다(다른 문서 제작 기능과 동일한 이유).
--
-- 결제 확인은 웹훅이 아니라 실행 시점에 Polar에 직접 물어봅니다(checkouts.get).
-- 자소서 첨삭 결제 경로(analysis_runs · billing_orders · analysis_entitlements)와
-- polar-webhook.ts는 건드리지 않습니다.

begin;

create table public.career_ai_builds (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scope text not null check (scope in ('interest', 'work_style', 'work_values', 'combined')),
  status text not null default 'PENDING' check (status in ('PENDING','CHECKOUT','RUNNING','USED','FAILED')),
  price_krw integer not null check (price_krw >= 0),
  provider_checkout_id text unique,
  checkout_url text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  used_at timestamptz
);

create index career_ai_builds_owner_idx on public.career_ai_builds (owner_user_id, created_at desc);
create trigger career_ai_builds_updated_at before update on public.career_ai_builds for each row execute function public.set_updated_at();

alter table public.career_ai_builds enable row level security;

-- 읽기와 만들기만 본인에게 엽니다. 상태를 바꾸는 것은 서버(service role)뿐입니다
-- — 결제 확인을 거치지 않고 status를 'CHECKOUT'으로 적을 수 있으면 값이 0원이
-- 됩니다.
create policy "members read own career ai builds" on public.career_ai_builds for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "members create own career ai builds" on public.career_ai_builds for insert to authenticated with check (owner_user_id = (select auth.uid()));

commit;
