-- 법률 "내 사건" — 사건 하나에 자료와 문서가 쌓이는 구조.
--
-- **여기는 앞의 제작 기능들과 반대로 자료를 저장합니다.** 이력서·경력기술서·
-- 포트폴리오 도구는 "서버에 저장하지 않는다"가 약속이었지만, 사건은 저장이 곧
-- 기능입니다. 소장을 쓸 때 넣은 계약서와 카톡은 석 달 뒤 준비서면에도, 다시
-- 항소이유서에도 그대로 필요합니다. 문서마다 자료를 새로 올리게 만들면 세
-- 번째쯤에서 사람이 떠납니다.
--
-- 그래서 저장하되 세 가지를 지킵니다.
--   1. RLS로 본인만 읽고 씁니다. 자료 표에도 owner_user_id를 따로 둡니다 —
--      사건을 거쳐 확인하는 정책은 조인이 하나 더 붙고, 그 조인을 빠뜨린
--      정책 한 줄이 남의 녹취록을 엽니다.
--   2. 사건을 지우면 자료·문서·결제기록이 함께 지워집니다(on delete cascade).
--   3. 화면에서 "저장됩니다"와 지우는 방법을 분명히 말합니다.
--
-- 법률 자료는 이 서비스에서 가장 민감한 자료입니다(녹취록·진료기록·판결문).
-- 원문 텍스트를 열에 담되, 서버 로그에는 남기지 않습니다.

begin;

create table public.legal_cases (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  case_type text not null check (case_type in ('CIVIL','LABOR','ADMIN','CRIMINAL','OTHER')),
  my_role text not null check (my_role in ('PLAINTIFF','DEFENDANT','UNDECIDED')),
  summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index legal_cases_owner_idx on public.legal_cases (owner_user_id, updated_at desc);
create trigger legal_cases_updated_at before update on public.legal_cases for each row execute function public.set_updated_at();

create table public.legal_case_materials (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('CASE_NARRATIVE','OPPONENT_CLAIM','CONTRACT','MESSAGE','RECORDING','JUDGMENT','EXISTING_BRIEF','OTHER')),
  filename text not null,
  text text not null,
  size_bytes integer not null default 0 check (size_bytes >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index legal_case_materials_case_idx on public.legal_case_materials (case_id, created_at);

create table public.legal_case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('CASE_ANALYSIS','DEMAND_LETTER','COMPLAINT','ANSWER','BRIEF','EVIDENCE_INDEX','REBUTTAL','JUDGMENT_ANALYSIS','APPEAL_NOTICE','APPEAL_REASONS')),
  title text not null default '',
  -- 만들어진 문서는 남깁니다. 사건의 연속성이 이 기능의 값이고, 준비서면 2차를
  -- 쓸 때 1차에서 뭐라고 했는지 볼 수 없으면 같은 말을 두 번 하게 됩니다.
  output jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index legal_case_documents_case_idx on public.legal_case_documents (case_id, created_at desc);

-- 결제 기록. 다른 제작 기능과 같은 모양이되 어느 사건의 어느 문서인지를 함께
-- 답니다 — 환불 문의가 오면 "무엇을 사셨는지"를 그 두 값으로 찾습니다.
create table public.legal_document_builds (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  case_id uuid references public.legal_cases(id) on delete cascade,
  doc_type text not null check (doc_type in ('CASE_ANALYSIS','DEMAND_LETTER','COMPLAINT','ANSWER','BRIEF','EVIDENCE_INDEX','REBUTTAL','JUDGMENT_ANALYSIS','APPEAL_NOTICE','APPEAL_REASONS')),
  status text not null default 'PENDING' check (status in ('PENDING','CHECKOUT','RUNNING','USED','FAILED')),
  price_krw integer not null check (price_krw >= 0),
  provider_checkout_id text unique,
  checkout_url text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  used_at timestamptz
);

create index legal_document_builds_owner_idx on public.legal_document_builds (owner_user_id, created_at desc);
create trigger legal_document_builds_updated_at before update on public.legal_document_builds for each row execute function public.set_updated_at();

alter table public.legal_cases enable row level security;
alter table public.legal_case_materials enable row level security;
alter table public.legal_case_documents enable row level security;
alter table public.legal_document_builds enable row level security;

-- 사건과 자료는 본인이 직접 만들고 지웁니다(서버를 거치지 않는 화면 동작이
-- 있습니다). 대신 문서와 결제기록은 읽기만 열고, 쓰는 것은 서버(service role)
-- 뿐입니다 — 결제 확인 없이 문서를 만들어 넣을 수 있으면 값이 0원이 됩니다.
create policy "members read own legal cases" on public.legal_cases for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "members create own legal cases" on public.legal_cases for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy "members update own legal cases" on public.legal_cases for update to authenticated using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy "members delete own legal cases" on public.legal_cases for delete to authenticated using (owner_user_id = (select auth.uid()));

create policy "members read own legal materials" on public.legal_case_materials for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "members create own legal materials" on public.legal_case_materials for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy "members delete own legal materials" on public.legal_case_materials for delete to authenticated using (owner_user_id = (select auth.uid()));

create policy "members read own legal documents" on public.legal_case_documents for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "members delete own legal documents" on public.legal_case_documents for delete to authenticated using (owner_user_id = (select auth.uid()));

create policy "members read own legal builds" on public.legal_document_builds for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "members create own legal builds" on public.legal_document_builds for insert to authenticated with check (owner_user_id = (select auth.uid()));

commit;
