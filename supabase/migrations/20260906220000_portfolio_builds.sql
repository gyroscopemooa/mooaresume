-- AI 포트폴리오 설명글 1건을 사고 쓰는 기록.
--
-- resume_builds · career_description_builds와 같은 모양입니다. 표를 합치지 않은
-- 이유는 상품이 다르면 환불·정산·통계를 각각 세게 되기 때문입니다. 한 표에
-- kind 열로 몰아 두면 그 열을 빠뜨린 질의 하나가 다른 상품의 매출을 섞습니다.
--
-- **포트폴리오 내용은 여기에 저장하지 않습니다.** 자료는 실행 요청에 실려
-- 왔다가 응답과 함께 사라지고, 남는 것은 "누가 언제 한 건을 샀고 썼는가"뿐입니다.

begin;

create table public.portfolio_builds (
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

create index portfolio_builds_owner_idx on public.portfolio_builds (owner_user_id, created_at desc);
create trigger portfolio_builds_updated_at before update on public.portfolio_builds for each row execute function public.set_updated_at();

alter table public.portfolio_builds enable row level security;

-- 읽기와 만들기만 본인에게 엽니다. 상태를 바꾸는 것은 서버(service role)뿐입니다.
create policy "members read own portfolio builds" on public.portfolio_builds for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "members create own portfolio builds" on public.portfolio_builds for insert to authenticated with check (owner_user_id = (select auth.uid()));

commit;
