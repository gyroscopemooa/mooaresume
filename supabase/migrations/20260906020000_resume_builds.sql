-- AI 이력서 제작 1건을 사고 쓰는 기록.
--
-- 자소서 첨삭의 결제(analysis_runs · billing_orders · analysis_entitlements)는
-- 건드리지 않습니다. 그쪽은 "지원 건(application_case) 하나에 대한 이용권"으로
-- 짜여 있는데 이력서 제작에는 지원 건도, 글자 수 과금도 없습니다. 억지로 끼우면
-- 돈이 오가는 경로를 이 기능 때문에 고치게 되므로, 작은 표 하나를 따로 둡니다.
--
-- **이력서 내용은 여기에 저장하지 않습니다.** 이름·생년월일·연락처가 들어오는
-- 자리이고, 무료 메이커가 "서버로 보내지 않습니다"라고 약속한 값입니다. 자료는
-- 실행 요청에 실려 왔다가 응답과 함께 사라지고, 남는 것은 "누가 언제 한 건을
-- 샀고 썼는가"뿐입니다.
--
-- 결제 확인은 웹훅이 아니라 실행 시점에 Polar에 직접 물어봅니다(checkouts.get).
-- 웹훅 경로를 함께 고치면 첨삭 결제가 이 기능의 버그에 같이 걸립니다.

begin;

create table public.resume_builds (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','CHECKOUT','RUNNING','USED','FAILED')),
  price_krw integer not null check (price_krw >= 0),
  provider_checkout_id text unique,
  checkout_url text,
  -- 실행을 몇 번 시도했는지. 모델이 실패하면 되돌려 주되(결제한 사람이 빈손으로
  -- 끝나면 안 됩니다), 무한히 되돌리면 한 번 결제로 계속 부를 수 있습니다.
  attempt_count integer not null default 0 check (attempt_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  used_at timestamptz
);

create index resume_builds_owner_idx on public.resume_builds (owner_user_id, created_at desc);
create trigger resume_builds_updated_at before update on public.resume_builds for each row execute function public.set_updated_at();

alter table public.resume_builds enable row level security;

-- 읽기와 만들기만 본인에게 엽니다. 상태를 바꾸는 것은 서버(service role)뿐입니다
-- — 결제 확인을 거치지 않고 status를 'CHECKOUT'으로 적을 수 있으면 값이 0원이
-- 됩니다.
create policy "members read own resume builds" on public.resume_builds for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "members create own resume builds" on public.resume_builds for insert to authenticated with check (owner_user_id = (select auth.uid()));

commit;
