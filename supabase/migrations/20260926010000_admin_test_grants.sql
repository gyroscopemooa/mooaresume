-- 관리자 무결제 테스트 이용권.
--
-- 목적: 운영자가 FINAL 을 점검할 때마다 실제로 결제하지 않아도, 실제 사용자와 같은
-- 입력 화면·파일 파서·FINAL 분석·결과 화면 경로를 그대로 걸어 볼 수 있게 한다.
--
-- 이 이용권은 결제가 아니다. 그래서 billing_orders 에 "PAID" 주문이나 영수증을 만들지
-- 않는다(가짜 매출·가짜 구매자·광고 전환이 생기면 안 된다). 대신 FINAL 분석이 실제로
-- 소비하는 analysis_entitlements 한 줄만 "테스트 이용권 출처"로 만든다.
--   - 주문이 없으므로 결제 통계·구매 내역·추천 보상·자동 환불 어느 쪽에도 잡히지 않는다.
--   - begin_quick_analysis 는 수정하지 않는다. 주문이 없으면 무료 이용권과 같은 반쪽
--     참고자료 한도를 쓴다(payment 여부를 billing_orders.amount 로 판단하기 때문).
--
-- 권한 원칙
--   - 발급·회수는 service_role 만 한다(관리자 화면의 서버 라우트가 관리자 쿠키와
--     서버 환경변수 허용 목록을 확인한 뒤 부른다).
--   - 사용(consume)은 로그인한 본인만, 본인 지원 건에, 자기에게 발급된 유효한 이용권으로만.
--   - 클라이언트가 보내는 isAdmin·이메일·user_metadata 는 어디에서도 권한 근거가 아니다.

begin;

create table public.admin_test_grants (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  product text not null check (product in ('FINAL')),
  max_uses integer not null check (max_uses between 1 and 10),
  -- 실제 FINAL 이용권이 덮는 글자 수와 같은 자리. 테스트가 실제보다 더 많이 읽게 하지 않는다.
  allowed_characters integer not null check (allowed_characters between 1000 and 100000),
  issued_by_user_id uuid references auth.users(id) on delete set null,
  issued_via text not null default 'admin_console' check (issued_via = 'admin_console'),
  note text check (note is null or char_length(note) <= 300),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index admin_test_grants_target_idx on public.admin_test_grants(target_user_id, created_at desc);

-- 사용 기록. 이용권 한 장이 어느 지원 건에 몇 번 쓰였는지 남는다(감사용).
create table public.admin_test_grant_uses (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.admin_test_grants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  application_case_id uuid references public.application_cases(id) on delete set null,
  -- 계정 삭제는 entitlement 를 먼저 지우므로 cascade 여야 삭제가 막히지 않는다.
  entitlement_id uuid unique references public.analysis_entitlements(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index admin_test_grant_uses_grant_idx on public.admin_test_grant_uses(grant_id, created_at);

alter table public.admin_test_grants enable row level security;
alter table public.admin_test_grant_uses enable row level security;

-- 본인에게 발급된 것만 읽을 수 있다(입력 화면이 "테스트 이용권 있음"을 보여 주려고).
-- 쓰기 정책은 없다: 발급·회수·사용 기록은 아래 함수로만 바뀐다.
create policy "test grant target read" on public.admin_test_grants for select to authenticated
  using ((select auth.uid()) = target_user_id);
create policy "test grant use read" on public.admin_test_grant_uses for select to authenticated
  using ((select auth.uid()) = user_id);

-- 관리자 테스트 콘솔의 "내 자료 세트". 한 번 저장해 두면 새 테스트 팩을 만들 때마다 다시 붙여 넣지 않아도 된다.
-- 서비스 키를 쓰는 콘솔 라우트만 읽고 쓴다(정책이 없어 브라우저에서는 어떤 행도 보이지 않는다).
create table public.admin_test_material_sets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create index admin_test_material_sets_owner_idx on public.admin_test_material_sets(owner_user_id, created_at desc);
alter table public.admin_test_material_sets enable row level security;
revoke all on table public.admin_test_material_sets from anon, authenticated;

-- 브라우저(anon/authenticated)는 읽기만 한다. 정책이 없어도 막히지만 권한 자체를 명시적으로 거둔다.
revoke all on table public.admin_test_grants from anon;
revoke all on table public.admin_test_grant_uses from anon;
revoke insert, update, delete, truncate on table public.admin_test_grants from authenticated;
revoke insert, update, delete, truncate on table public.admin_test_grant_uses from authenticated;

-- 이용권 출처 열. 결제 주문이 있으면 주문, 없으면 반드시 테스트 이용권 — 둘 중 정확히 하나.
-- 기존 행은 전부 billing_order_id 가 채워져 있으므로 이 제약을 그대로 통과한다.
alter table public.analysis_entitlements alter column billing_order_id drop not null;
alter table public.analysis_entitlements
  add column test_grant_id uuid references public.admin_test_grants(id) on delete restrict;
alter table public.analysis_entitlements
  add constraint analysis_entitlements_single_source check (
    (billing_order_id is not null and test_grant_id is null)
    or (billing_order_id is null and test_grant_id is not null)
  );

/*
 * 테스트 이용권 발급 (service_role 전용).
 *
 * 한 계정에 살아 있는 이용권이 3장을 넘지 않게 막는다 — 실수로 계속 발급해 두는 것을 방지.
 * 만료는 1~168시간.
 */
create or replace function public.issue_admin_test_grant(
  p_target_user_id uuid,
  p_issued_by_user_id uuid,
  p_max_uses integer,
  p_allowed_characters integer,
  p_ttl_hours integer,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
  new_grant public.admin_test_grants%rowtype;
begin
  if p_target_user_id is null or not exists (select 1 from auth.users where id = p_target_user_id) then
    raise exception 'TEST_GRANT_TARGET_NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_ttl_hours is null or p_ttl_hours < 1 or p_ttl_hours > 168 then
    raise exception 'TEST_GRANT_TTL_INVALID' using errcode = '22023';
  end if;

  select count(*) into active_count from public.admin_test_grants g
  where g.target_user_id = p_target_user_id and g.revoked_at is null and g.expires_at > now();
  if active_count >= 3 then
    raise exception 'TEST_GRANT_TOO_MANY_ACTIVE' using errcode = '55000';
  end if;

  insert into public.admin_test_grants (
    target_user_id, product, max_uses, allowed_characters, issued_by_user_id, note, expires_at
  ) values (
    p_target_user_id, 'FINAL', p_max_uses, p_allowed_characters, p_issued_by_user_id,
    nullif(btrim(coalesce(p_note, '')), ''),
    now() + make_interval(hours => p_ttl_hours)
  ) returning * into new_grant;

  return jsonb_build_object('grantId', new_grant.id, 'expiresAt', new_grant.expires_at, 'maxUses', new_grant.max_uses);
end;
$$;

/*
 * 테스트 이용권 회수 (service_role 전용).
 *
 * 아직 쓰지 않은(ACTIVE) 이용권은 함께 거둔다. 이미 소비된 것은 그대로 두되,
 * 면접 준비팩 등 이후 생성은 이용권이 유효한지를 매번 다시 확인하므로 새로 만들 수 없다.
 */
create or replace function public.revoke_admin_test_grant(p_grant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_grant public.admin_test_grants%rowtype;
  revoked_entitlements integer;
begin
  select * into found_grant from public.admin_test_grants where id = p_grant_id for update;
  if found_grant.id is null then
    raise exception 'TEST_GRANT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if found_grant.revoked_at is null then
    update public.admin_test_grants set revoked_at = now() where id = found_grant.id;
  end if;

  update public.analysis_entitlements
  set status = 'REVOKED', revoked_at = now()
  where test_grant_id = found_grant.id and status = 'ACTIVE';
  get diagnostics revoked_entitlements = row_count;

  return jsonb_build_object('grantId', found_grant.id, 'entitlementsRevoked', revoked_entitlements);
end;
$$;

/*
 * 테스트 이용권으로 FINAL 이용권 한 장 만들기 (로그인한 본인).
 *
 * reward_credits 의 consume_reward_credit 과 같은 자리·같은 규칙이다 — 입력 화면이
 * 결제 대신 이 함수를 부른 뒤 분석을 시작한다.
 *   - 본인 지원 건에만.
 *   - 자기에게 발급됐고, 회수되지 않았고, 만료되지 않았고, 사용 횟수가 남은 이용권만.
 *   - 같은 지원 건에 이미 살아 있는 FINAL 이용권이 있으면 쌓지 않는다.
 * 동시에 두 번 눌러도 횟수를 넘지 못한다(이용권 행을 잠근 뒤 사용 횟수를 센다).
 */
create or replace function public.consume_admin_test_grant(p_application_case_id uuid, p_product text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  case_owner_id uuid;
  candidate public.admin_test_grants%rowtype;
  chosen public.admin_test_grants%rowtype;
  used_count integer;
  new_entitlement_id uuid;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;
  if p_product is distinct from 'FINAL' then
    raise exception 'INVALID_PRODUCT' using errcode = '22023';
  end if;

  select owner_user_id into case_owner_id
  from public.application_cases
  where id = p_application_case_id
  for update;

  if case_owner_id is null or case_owner_id <> current_user_id then
    raise exception 'APPLICATION_CASE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.analysis_entitlements ae
    where ae.application_case_id = p_application_case_id
      and ae.owner_user_id = current_user_id
      and ae.product = p_product and ae.status = 'ACTIVE'
  ) then
    raise exception 'ACTIVE_ENTITLEMENT_EXISTS' using errcode = '55000';
  end if;

  for candidate in
    select * from public.admin_test_grants g
    where g.target_user_id = current_user_id
      and g.product = p_product
      and g.revoked_at is null
      and g.expires_at > now()
    order by g.expires_at, g.created_at
    for update
  loop
    select count(*) into used_count from public.admin_test_grant_uses u where u.grant_id = candidate.id;
    if used_count < candidate.max_uses then
      chosen := candidate;
      exit;
    end if;
  end loop;

  if chosen.id is null then
    raise exception 'TEST_GRANT_NOT_AVAILABLE' using errcode = '42501';
  end if;

  insert into public.analysis_entitlements (
    application_case_id, owner_user_id, product, allowed_characters, test_grant_id
  ) values (
    p_application_case_id, current_user_id, p_product, chosen.allowed_characters, chosen.id
  ) returning id into new_entitlement_id;

  insert into public.admin_test_grant_uses (grant_id, user_id, application_case_id, entitlement_id)
  values (chosen.id, current_user_id, p_application_case_id, new_entitlement_id);

  return jsonb_build_object('grantId', chosen.id, 'entitlementId', new_entitlement_id, 'product', p_product);
end;
$$;

revoke all on function public.issue_admin_test_grant(uuid, uuid, integer, integer, integer, text) from public, anon, authenticated;
revoke all on function public.revoke_admin_test_grant(uuid) from public, anon, authenticated;
revoke all on function public.consume_admin_test_grant(uuid, text) from public, anon;
grant execute on function public.issue_admin_test_grant(uuid, uuid, integer, integer, integer, text) to service_role;
grant execute on function public.revoke_admin_test_grant(uuid) to service_role;
grant execute on function public.consume_admin_test_grant(uuid, text) to authenticated;

commit;
