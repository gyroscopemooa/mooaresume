-- AI 경력기술서 제작 1건을 사고 쓰는 기록.
--
-- resume_builds(20260906020000)와 같은 이유로 별도 표를 둡니다. 자소서 첨삭의
-- 결제 경로(analysis_runs · billing_orders · analysis_entitlements)는 "지원 건
-- 하나에 대한 이용권"으로 짜여 있어 이 기능에는 맞지 않고, 억지로 끼우면 그
-- 결제 경로를 이 기능의 버그에 같이 걸리게 합니다.
--
-- **경력기술서 내용은 여기에 저장하지 않습니다.** 이력서·자소서·자격증처럼
-- 민감한 자료가 들어오는 자리입니다. 자료는 실행 요청에 실려 왔다가 응답과
-- 함께 사라지고, 남는 것은 "누가 언제 한 건을 샀고 썼는가"뿐입니다.
--
-- 결제 확인은 웹훅이 아니라 실행 시점에 Polar에 직접 물어봅니다(checkouts.get).

begin;

create table public.career_description_builds (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','CHECKOUT','RUNNING','USED','FAILED')),
  price_krw integer not null check (price_krw >= 0),
  provider_checkout_id text unique,
  checkout_url text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  used_at timestamptz
);

create index career_description_builds_owner_idx on public.career_description_builds (owner_user_id, created_at desc);
create trigger career_description_builds_updated_at before update on public.career_description_builds for each row execute function public.set_updated_at();

alter table public.career_description_builds enable row level security;

-- 읽기와 만들기만 본인에게 엽니다. 상태를 바꾸는 것은 서버(service role)뿐입니다
-- — 결제 확인을 거치지 않고 status를 'CHECKOUT'으로 적을 수 있으면 값이 0원이
-- 됩니다.
create policy "members read own career description builds" on public.career_description_builds for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "members create own career description builds" on public.career_description_builds for insert to authenticated with check (owner_user_id = (select auth.uid()));

commit;
