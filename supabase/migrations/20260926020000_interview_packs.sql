-- FINAL 면접 준비팩.
--
-- 제출한 자료로 자기소개·면접 답변을 만들고 키워드로 연습하는 텍스트 준비물이다.
-- 기존 모의면접(interview_sessions 계열)과는 별개이며 그 표들은 건드리지 않는다.
--
-- 새 표가 필요한 이유(AGENTS.md "표를 만들기 전에 이유를 설명"):
--   interview_packs            지원 건(FINAL 실행) 하나당 팩 하나, 사용량 한도·진행 잠금·점검 결과
--   interview_pack_materials   자료를 "별도 버전"으로 쌓는다(원본 FINAL 자료·첨삭 결과는 덮어쓰지 않는다)
--   interview_pack_answers     답변 카드를 고친 때마다 새 판으로 쌓는다(이전 버전 복원)
--   interview_pack_usage       동시 클릭·새로고침에도 이중 차감되지 않는 사용량 예약 장부
--   interview_pack_ai_calls    AI 호출 원장. 팩·테스트 자료를 초기화해도 비용·안전 한도 기록은 남는다
--
-- 보안: 모든 표는 RLS 로 소유자만 읽는다. 쓰기는 service_role 이 부르는 함수로만 일어나고,
-- 각 함수가 소유자를 스스로 다시 확인한다(라우트가 실수해도 남의 팩을 바꾸지 못하게).

begin;

-- ───────────────────────── 접근 판정 ─────────────────────────

/*
 * 이 FINAL 실행으로 면접 준비팩을 새로 만들어도 되는가.
 *
 * 매번 다시 계산한다(만든 뒤에 환불·회수·만료가 될 수 있으므로).
 *   - 소유자 본인의 FINAL, 완료된 실행이어야 한다.
 *   - 이 실행을 소비한 이용권이 있어야 한다.
 *   - 테스트 이용권이면 회수·만료가 아니어야 한다.
 *   - 결제 이용권이면 주문이 PAID 여야 한다(환불·검토 필요 상태는 새 생성만 막는다. 읽기는 따로 열려 있다).
 * 반환 accessSource 는 이후 주문·이용권·작업·결과의 "테스트 구분"이 된다.
 */
create or replace function public.interview_pack_run_access(p_run_id uuid, p_owner_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_run public.analysis_runs%rowtype;
  used_entitlement public.analysis_entitlements%rowtype;
  found_grant public.admin_test_grants%rowtype;
  found_order public.billing_orders%rowtype;
begin
  select * into target_run from public.analysis_runs
  where id = p_run_id and owner_user_id = p_owner_user_id;
  if target_run.id is null then
    return jsonb_build_object('allowed', false, 'reason', 'RUN_NOT_FOUND');
  end if;
  if target_run.product <> 'FINAL' then
    return jsonb_build_object('allowed', false, 'reason', 'NOT_FINAL');
  end if;
  if target_run.status <> 'COMPLETED' then
    return jsonb_build_object('allowed', false, 'reason', 'NOT_COMPLETED');
  end if;

  select * into used_entitlement from public.analysis_entitlements ae
  where ae.consumed_by_analysis_run_id = target_run.id and ae.owner_user_id = p_owner_user_id;
  if used_entitlement.id is null then
    return jsonb_build_object('allowed', false, 'reason', 'ENTITLEMENT_NOT_FOUND');
  end if;

  if used_entitlement.test_grant_id is not null then
    select * into found_grant from public.admin_test_grants where id = used_entitlement.test_grant_id;
    if found_grant.id is null or found_grant.revoked_at is not null then
      return jsonb_build_object('allowed', false, 'reason', 'TEST_GRANT_REVOKED');
    end if;
    if found_grant.expires_at <= now() then
      return jsonb_build_object('allowed', false, 'reason', 'TEST_GRANT_EXPIRED');
    end if;
    return jsonb_build_object(
      'allowed', true, 'reason', null, 'accessSource', 'admin_test',
      'testGrantId', found_grant.id, 'completedAt', target_run.completed_at
    );
  end if;

  select * into found_order from public.billing_orders where id = used_entitlement.billing_order_id;
  if found_order.id is null or found_order.status <> 'PAID' then
    return jsonb_build_object('allowed', false, 'reason', 'ORDER_NOT_PAID');
  end if;

  return jsonb_build_object(
    'allowed', true, 'reason', null,
    'accessSource', case found_order.provider
      when 'POLAR' then 'polar'
      when 'GOOGLE_PLAY' then 'google_play'
      when 'MOOA_CREDIT' then 'mooa_credit'
      else 'unknown' end,
    'testGrantId', null,
    'completedAt', target_run.completed_at
  );
end;
$$;

-- ───────────────────────── 표 ─────────────────────────

create table public.interview_packs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  -- final_run: 실제(또는 테스트 이용권으로 만든) FINAL 실행에 붙은 팩.
  -- admin_snapshot: 관리자 테스트가 가상/복제 자료로 만든 팩. 어떤 결제·실행과도 이어지지 않는다.
  origin text not null check (origin in ('final_run', 'admin_snapshot')),
  analysis_run_id uuid references public.analysis_runs(id) on delete cascade,
  cloned_from_run_id uuid references public.analysis_runs(id) on delete set null,
  -- 권한 출처. admin_test 이면 모든 통계·매출 집계에서 제외해야 하는 테스트 팩이다.
  access_source text not null check (access_source in ('polar', 'google_play', 'mooa_credit', 'admin_test', 'unknown')),
  test_grant_id uuid references public.admin_test_grants(id) on delete set null,
  is_test boolean generated always as (access_source = 'admin_test') stored,
  label text check (label is null or char_length(label) <= 120),

  materials_version integer not null default 1 check (materials_version >= 1),
  -- 자료 점검(사실·충돌·문항별 상태) 결과와, 그것이 어느 자료 버전 기준인지.
  assessment jsonb check (assessment is null or jsonb_typeof(assessment) = 'object'),
  assessment_materials_version integer,

  -- 한도는 팩을 만들 때의 서버 설정으로 고정한다. 나중에 설정을 바꿔도 이미 만든 팩은 그대로다.
  limit_initial integer not null check (limit_initial between 1 and 3),
  limit_edit integer not null check (limit_edit between 0 and 20),
  limit_check integer not null check (limit_check between 1 and 20),
  limit_complete integer not null check (limit_complete between 1 and 20),
  initial_generated_at timestamptz,

  -- 한 팩에서 AI 작업은 한 번에 하나만. 만료 시각이 지나면 죽은 요청으로 보고 잠금을 푼다.
  busy_kind text check (busy_kind is null or busy_kind in ('check', 'initial', 'complete', 'edit')),
  busy_request_key text,
  busy_until timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (origin = 'final_run' and analysis_run_id is not null)
    or (origin = 'admin_snapshot' and analysis_run_id is null)
  ),
  check (origin <> 'admin_snapshot' or access_source = 'admin_test')
);

create unique index interview_packs_run_uidx on public.interview_packs(analysis_run_id) where analysis_run_id is not null;
create index interview_packs_owner_idx on public.interview_packs(owner_user_id, created_at desc);
create trigger interview_packs_updated_at before update on public.interview_packs
for each row execute function public.set_updated_at();

create table public.interview_pack_materials (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.interview_packs(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  version_no integer not null check (version_no >= 1),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  unique (pack_id, version_no)
);

create table public.interview_pack_answers (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.interview_packs(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null check (slot in (
    'intro_30', 'intro_60', 'motivation_company', 'aspiration', 'motivation_role', 'strength',
    'weakness', 'role_experience', 'problem_solving', 'collaboration', 'closing'
  )),
  revision_no integer not null check (revision_no >= 1),
  origin text not null check (origin in ('ai', 'ai_revised', 'user_edited', 'restored')),
  -- 이 카드가 어느 자료 버전 기준으로 만들어졌는지. 최신 자료 버전보다 낮으면 화면이 "이전 자료 기준"을 붙인다.
  materials_version integer not null check (materials_version >= 1),
  card jsonb not null check (jsonb_typeof(card) = 'object'),
  model text,
  prompt_version text,
  schema_version text not null default '1',
  created_at timestamptz not null default now(),
  unique (pack_id, slot, revision_no)
);

create index interview_pack_answers_slot_idx on public.interview_pack_answers(pack_id, slot, revision_no desc);

create table public.interview_pack_usage (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.interview_packs(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('check', 'initial', 'complete', 'edit')),
  -- 화면이 클릭마다 만든 값. 같은 값이 다시 오면(새로고침·중복 클릭) 두 번 세지 않는다.
  request_key text not null check (char_length(request_key) between 8 and 80),
  slot text,
  state text not null default 'reserved' check (state in ('reserved', 'confirmed', 'released')),
  reserved_at timestamptz not null default now(),
  settled_at timestamptz,
  failure_code text,
  unique (pack_id, request_key),
  check ((state = 'reserved' and settled_at is null) or (state <> 'reserved' and settled_at is not null))
);

create index interview_pack_usage_count_idx on public.interview_pack_usage(pack_id, kind, state);

-- AI 호출 원장. 팩이 지워져도(테스트 초기화) 남도록 pack_id 는 set null 이다.
-- 이 표가 하루 테스트 호출 한도와 비용 기록의 근거라서, 초기화로 한도가 리셋되면 안 된다.
create table public.interview_pack_ai_calls (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  pack_id uuid references public.interview_packs(id) on delete set null,
  is_test boolean not null,
  purpose text not null check (purpose in ('check', 'generate', 'complete', 'revise')),
  outcome text not null check (outcome in ('COMPLETED', 'PROVIDER_FAILED', 'INVALID_OUTPUT', 'ERROR')),
  model text,
  response_id text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  failure_code text,
  created_at timestamptz not null default now()
);

create index interview_pack_ai_calls_test_day_idx on public.interview_pack_ai_calls(is_test, created_at);
create index interview_pack_ai_calls_owner_idx on public.interview_pack_ai_calls(owner_user_id, created_at desc);

alter table public.interview_packs enable row level security;
alter table public.interview_pack_materials enable row level security;
alter table public.interview_pack_answers enable row level security;
alter table public.interview_pack_usage enable row level security;
alter table public.interview_pack_ai_calls enable row level security;

create policy "interview pack owner read" on public.interview_packs for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy "interview pack materials owner read" on public.interview_pack_materials for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy "interview pack answers owner read" on public.interview_pack_answers for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy "interview pack usage owner read" on public.interview_pack_usage for select to authenticated
  using ((select auth.uid()) = owner_user_id);

revoke all on table public.interview_packs, public.interview_pack_materials, public.interview_pack_answers, public.interview_pack_usage from anon;
revoke insert, update, delete, truncate on table public.interview_packs, public.interview_pack_materials, public.interview_pack_answers, public.interview_pack_usage from authenticated;
-- 원장은 브라우저에서 읽지도 쓰지도 못한다.
revoke all on table public.interview_pack_ai_calls from anon, authenticated;
grant select, insert on table public.interview_pack_ai_calls to service_role;

-- ───────────────────────── 만들기 ─────────────────────────

/*
 * 실제 FINAL 실행에 팩을 만든다(이미 있으면 그대로 돌려준다).
 * 자료 1번 버전은 서버가 읽어 온 원본 스냅샷이다. 권한은 여기서 다시 확인한다.
 */
create or replace function public.create_interview_pack(
  p_owner_user_id uuid,
  p_analysis_run_id uuid,
  p_materials jsonb,
  p_limits jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  access jsonb;
  new_pack_id uuid;
  existing_pack_id uuid;
begin
  access := public.interview_pack_run_access(p_analysis_run_id, p_owner_user_id);
  if not (access->>'allowed')::boolean then
    raise exception 'PACK_NOT_ALLOWED:%', access->>'reason' using errcode = '42501';
  end if;

  insert into public.interview_packs (
    owner_user_id, origin, analysis_run_id, access_source, test_grant_id,
    limit_initial, limit_edit, limit_check, limit_complete
  ) values (
    p_owner_user_id, 'final_run', p_analysis_run_id, access->>'accessSource', nullif(access->>'testGrantId', '')::uuid,
    coalesce((p_limits->>'initial')::integer, 1), coalesce((p_limits->>'edit')::integer, 3),
    coalesce((p_limits->>'check')::integer, 5), coalesce((p_limits->>'complete')::integer, 6)
  )
  on conflict (analysis_run_id) where analysis_run_id is not null do nothing
  returning id into new_pack_id;

  if new_pack_id is null then
    select id into existing_pack_id from public.interview_packs
    where analysis_run_id = p_analysis_run_id and owner_user_id = p_owner_user_id;
    if existing_pack_id is null then
      raise exception 'PACK_NOT_FOUND' using errcode = 'P0002';
    end if;
    return jsonb_build_object('packId', existing_pack_id, 'created', false);
  end if;

  insert into public.interview_pack_materials (pack_id, owner_user_id, version_no, payload)
  values (new_pack_id, p_owner_user_id, 1, p_materials);

  return jsonb_build_object('packId', new_pack_id, 'created', true);
end;
$$;

/*
 * 관리자 테스트용 팩(가상 샘플·저장한 자료 세트·내 FINAL 결과 복제).
 * 어떤 결제나 FINAL 실행과도 이어지지 않으므로 access_source 는 언제나 admin_test 다.
 * 호출 전에 서버가 관리자·승인된 테스트 계정임을 확인한다. 한 계정이 만들 수 있는 팩은 30개까지.
 */
create or replace function public.create_admin_snapshot_pack(
  p_owner_user_id uuid,
  p_materials jsonb,
  p_limits jsonb,
  p_label text,
  p_cloned_from_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_count integer;
  new_pack_id uuid;
begin
  if p_owner_user_id is null or not exists (select 1 from auth.users where id = p_owner_user_id) then
    raise exception 'PACK_OWNER_NOT_FOUND' using errcode = 'P0002';
  end if;
  select count(*) into existing_count from public.interview_packs
  where owner_user_id = p_owner_user_id and origin = 'admin_snapshot';
  if existing_count >= 30 then
    raise exception 'TOO_MANY_TEST_PACKS' using errcode = '55000';
  end if;

  insert into public.interview_packs (
    owner_user_id, origin, cloned_from_run_id, access_source, label,
    limit_initial, limit_edit, limit_check, limit_complete
  ) values (
    p_owner_user_id, 'admin_snapshot', p_cloned_from_run_id, 'admin_test', nullif(left(btrim(coalesce(p_label, '')), 120), ''),
    coalesce((p_limits->>'initial')::integer, 1), coalesce((p_limits->>'edit')::integer, 3),
    coalesce((p_limits->>'check')::integer, 5), coalesce((p_limits->>'complete')::integer, 6)
  ) returning id into new_pack_id;

  insert into public.interview_pack_materials (pack_id, owner_user_id, version_no, payload)
  values (new_pack_id, p_owner_user_id, 1, p_materials);

  return jsonb_build_object('packId', new_pack_id, 'created', true);
end;
$$;

/*
 * 사용자가 보완한 내용을 "새 자료 버전"으로 쌓는다. AI 호출도, 사용량 차감도 없다.
 * 기존 버전(원본 스냅샷 포함)은 절대 고치지 않는다. 팩 하나에 버전은 30개까지.
 */
create or replace function public.save_interview_pack_materials(
  p_owner_user_id uuid,
  p_pack_id uuid,
  p_payload jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.interview_packs%rowtype;
  next_version integer;
begin
  select * into target from public.interview_packs
  where id = p_pack_id and owner_user_id = p_owner_user_id for update;
  if target.id is null then
    raise exception 'PACK_NOT_FOUND' using errcode = 'P0002';
  end if;

  select coalesce(max(version_no), 0) + 1 into next_version
  from public.interview_pack_materials where pack_id = target.id;
  if next_version > 30 then
    raise exception 'MATERIAL_VERSION_LIMIT' using errcode = '55000';
  end if;

  insert into public.interview_pack_materials (pack_id, owner_user_id, version_no, payload)
  values (target.id, p_owner_user_id, next_version, p_payload);
  update public.interview_packs set materials_version = next_version where id = target.id;
  return next_version;
end;
$$;

-- ───────────────────────── 사용량 예약·확정 ─────────────────────────

/*
 * AI 작업 전에 부르는 원자적 예약.
 *
 * 한 트랜잭션 안에서(팩 행을 잠근 채) 권한 → 재요청 여부 → 진행 중 여부 → 한도 → 예약 순으로 본다.
 * 그래서 두 번 클릭해도 한 번만 예약되고, 동시에 두 요청이 와도 한도를 넘지 못한다.
 *
 *  - check     자료 점검. 사용자에게 "생성권"으로 보이지 않는 안전 상한(기본 5).
 *  - initial   팩 최초 생성(기본 1). 실패하면 released 로 되돌려 차감하지 않는다.
 *  - complete  최초 팩에서 보류된 문항을 보완 뒤 이어 만드는 것. 최초 완성 범위라 사용자 몫은 깎지 않고 안전 상한만 둔다.
 *  - edit      이미 완성된 답변을 AI로 고치기(기본 3).
 *
 * 예약은 5분이 지나면 죽은 요청으로 보고 세지 않는다(서버가 중간에 죽어도 영원히 잠기지 않는다).
 */
create or replace function public.reserve_interview_pack_usage(
  p_owner_user_id uuid,
  p_pack_id uuid,
  p_kind text,
  p_request_key text,
  p_slot text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.interview_packs%rowtype;
  access jsonb;
  existing public.interview_pack_usage%rowtype;
  kind_limit integer;
  used_count integer;
  new_usage_id uuid;
  now_utc timestamptz := now();
begin
  if p_kind is null or p_kind not in ('check', 'initial', 'complete', 'edit') then
    raise exception 'INVALID_USAGE_KIND' using errcode = '22023';
  end if;
  if p_request_key is null or char_length(p_request_key) not between 8 and 80 then
    raise exception 'INVALID_REQUEST_KEY' using errcode = '22023';
  end if;

  select * into target from public.interview_packs
  where id = p_pack_id and owner_user_id = p_owner_user_id for update;
  if target.id is null then
    raise exception 'PACK_NOT_FOUND' using errcode = 'P0002';
  end if;

  if target.origin = 'final_run' then
    access := public.interview_pack_run_access(target.analysis_run_id, p_owner_user_id);
    if not (access->>'allowed')::boolean then
      return jsonb_build_object('outcome', 'DENIED', 'reason', access->>'reason');
    end if;
  end if;

  -- 5분이 지나도록 정리되지 않은 예약은 죽은 요청이다. 여기서 반납 처리해 두면, 그 요청이 나중에
  -- 늦게 끝나 저장하려 해도 USAGE_NOT_ACTIVE 로 거절된다(이어받은 다른 요청의 결과를 덮지 못한다).
  update public.interview_pack_usage
  set state = 'released', settled_at = now_utc, failure_code = 'EXPIRED'
  where pack_id = target.id and state = 'reserved' and reserved_at <= now_utc - interval '5 minutes';

  select * into existing from public.interview_pack_usage
  where pack_id = target.id and request_key = p_request_key;
  if existing.id is not null then
    return jsonb_build_object('outcome', 'DUPLICATE', 'usageId', existing.id, 'state', existing.state, 'kind', existing.kind);
  end if;

  if p_kind in ('complete', 'edit') and target.initial_generated_at is null then
    return jsonb_build_object('outcome', 'INITIAL_REQUIRED');
  end if;

  if target.busy_until is not null and target.busy_until > now_utc then
    return jsonb_build_object('outcome', 'BUSY', 'kind', target.busy_kind);
  end if;

  kind_limit := case p_kind
    when 'check' then target.limit_check
    when 'initial' then target.limit_initial
    when 'complete' then target.limit_complete
    else target.limit_edit end;

  select count(*) into used_count from public.interview_pack_usage u
  where u.pack_id = target.id and u.kind = p_kind
    and (u.state = 'confirmed' or (u.state = 'reserved' and u.reserved_at > now_utc - interval '5 minutes'));
  if used_count >= kind_limit then
    return jsonb_build_object('outcome', 'LIMIT_REACHED', 'used', used_count, 'limit', kind_limit);
  end if;

  insert into public.interview_pack_usage (pack_id, owner_user_id, kind, request_key, slot)
  values (target.id, p_owner_user_id, p_kind, p_request_key, p_slot)
  returning id into new_usage_id;

  update public.interview_packs
  set busy_kind = p_kind, busy_request_key = p_request_key, busy_until = now_utc + interval '5 minutes'
  where id = target.id;

  return jsonb_build_object('outcome', 'RESERVED', 'usageId', new_usage_id, 'used', used_count + 1, 'limit', kind_limit);
end;
$$;

/*
 * 예약을 되돌리거나(released) 확정한다(confirmed). 실패·잘못된 출력이면 released — 사용자 횟수를 깎지 않는다.
 * 이미 정리된 예약이면 false. 이 예약이 잡고 있던 진행 잠금도 함께 푼다.
 */
create or replace function public.settle_interview_pack_usage(
  p_owner_user_id uuid,
  p_usage_id uuid,
  p_state text,
  p_failure_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  settled public.interview_pack_usage%rowtype;
begin
  if p_state is null or p_state not in ('released', 'confirmed') then
    raise exception 'INVALID_USAGE_STATE' using errcode = '22023';
  end if;

  update public.interview_pack_usage
  set state = p_state, settled_at = now(), failure_code = left(p_failure_code, 120)
  where id = p_usage_id and owner_user_id = p_owner_user_id and state = 'reserved'
  returning * into settled;
  if settled.id is null then
    return false;
  end if;

  update public.interview_packs
  set busy_kind = null, busy_request_key = null, busy_until = null
  where id = settled.pack_id and busy_request_key = settled.request_key;
  return true;
end;
$$;

-- ───────────────────────── 결과 저장 ─────────────────────────

/*
 * 자료 점검 결과 저장 + 예약 확정. 예약이 더는 유효하지 않으면(초기화·만료·다른 요청이 이어받음)
 * USAGE_NOT_ACTIVE — 늦게 끝난 작업이 지워진 결과를 되살리지 못한다.
 */
create or replace function public.save_interview_pack_assessment(
  p_owner_user_id uuid,
  p_usage_id uuid,
  p_materials_version integer,
  p_assessment jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  pack_ref uuid;
  target public.interview_packs%rowtype;
  active_usage public.interview_pack_usage%rowtype;
begin
  select pack_id into pack_ref from public.interview_pack_usage
  where id = p_usage_id and owner_user_id = p_owner_user_id;
  if pack_ref is null then
    raise exception 'USAGE_NOT_ACTIVE' using errcode = '55000';
  end if;

  select * into target from public.interview_packs where id = pack_ref and owner_user_id = p_owner_user_id for update;
  select * into active_usage from public.interview_pack_usage
  where id = p_usage_id and owner_user_id = p_owner_user_id and state = 'reserved' and kind = 'check' for update;
  if target.id is null or active_usage.id is null then
    raise exception 'USAGE_NOT_ACTIVE' using errcode = '55000';
  end if;

  update public.interview_packs
  set assessment = p_assessment, assessment_materials_version = p_materials_version
  where id = target.id;
  perform public.settle_interview_pack_usage(p_owner_user_id, p_usage_id, 'confirmed', null);
  return true;
end;
$$;

/*
 * 충돌 확인 뒤 점검 결과의 "상태만" 다시 계산해 저장한다(AI 호출 없음, 사용량 차감 없음).
 * 새 자료 버전을 만든 직후에 부르며, 점검 결과가 새 버전 기준이 되어 바로 생성으로 넘어갈 수 있게 한다.
 * 진행 중인 AI 작업이 있으면(pack 이 busy) 덮어쓰지 않는다.
 */
create or replace function public.refresh_interview_pack_assessment(
  p_owner_user_id uuid,
  p_pack_id uuid,
  p_materials_version integer,
  p_assessment jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.interview_packs%rowtype;
begin
  select * into target from public.interview_packs
  where id = p_pack_id and owner_user_id = p_owner_user_id for update;
  if target.id is null then
    raise exception 'PACK_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target.assessment is null then
    return false;
  end if;
  if target.busy_until is not null and target.busy_until > now() then
    raise exception 'PACK_BUSY' using errcode = '55P03';
  end if;
  if p_materials_version > target.materials_version then
    raise exception 'MATERIAL_VERSION_UNKNOWN' using errcode = '22023';
  end if;
  update public.interview_packs
  set assessment = p_assessment, assessment_materials_version = p_materials_version
  where id = target.id;
  return true;
end;
$$;

/*
 * 생성·이어 만들기·AI 수정 결과 저장 + 예약 확정.
 *
 * p_cards 는 [{slot, card, model, promptVersion}] 배열. 문항마다 새 판(revision)으로 쌓는다 — 이전 판은 지우지 않는다.
 * 'complete' 는 이미 답변이 있는 문항을 덮어쓰지 않는다(보류됐던 문항만 채운다).
 */
create or replace function public.save_interview_pack_answers(
  p_owner_user_id uuid,
  p_usage_id uuid,
  p_materials_version integer,
  p_cards jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pack_ref uuid;
  target public.interview_packs%rowtype;
  active_usage public.interview_pack_usage%rowtype;
  item jsonb;
  item_slot text;
  next_revision integer;
  saved_count integer := 0;
  new_origin text;
begin
  select pack_id into pack_ref from public.interview_pack_usage
  where id = p_usage_id and owner_user_id = p_owner_user_id;
  if pack_ref is null then
    raise exception 'USAGE_NOT_ACTIVE' using errcode = '55000';
  end if;

  select * into target from public.interview_packs where id = pack_ref and owner_user_id = p_owner_user_id for update;
  select * into active_usage from public.interview_pack_usage
  where id = p_usage_id and owner_user_id = p_owner_user_id and state = 'reserved' and kind in ('initial', 'complete', 'edit') for update;
  if target.id is null or active_usage.id is null then
    raise exception 'USAGE_NOT_ACTIVE' using errcode = '55000';
  end if;
  if jsonb_typeof(p_cards) <> 'array' then
    raise exception 'INVALID_CARDS' using errcode = '22023';
  end if;

  new_origin := case active_usage.kind when 'edit' then 'ai_revised' else 'ai' end;

  for item in select * from jsonb_array_elements(p_cards) loop
    item_slot := item->>'slot';
    if active_usage.kind = 'edit' and item_slot is distinct from active_usage.slot then
      -- 수정 예약은 그 문항 하나만 바꿀 수 있다.
      continue;
    end if;
    if active_usage.kind = 'complete' and exists (
      select 1 from public.interview_pack_answers a where a.pack_id = target.id and a.slot = item_slot
    ) then
      continue;
    end if;

    select coalesce(max(revision_no), 0) + 1 into next_revision
    from public.interview_pack_answers where pack_id = target.id and slot = item_slot;

    insert into public.interview_pack_answers (
      pack_id, owner_user_id, slot, revision_no, origin, materials_version, card, model, prompt_version
    ) values (
      target.id, p_owner_user_id, item_slot, next_revision, new_origin, p_materials_version, item->'card',
      item->>'model', item->>'promptVersion'
    );
    saved_count := saved_count + 1;
  end loop;

  if active_usage.kind = 'initial' then
    update public.interview_packs set initial_generated_at = coalesce(initial_generated_at, now())
    where id = target.id;
  end if;
  perform public.settle_interview_pack_usage(p_owner_user_id, p_usage_id, 'confirmed', null);
  return jsonb_build_object('saved', saved_count);
end;
$$;

/*
 * 사용자가 직접 고친 답변·이전 버전 복원. AI 호출도 사용량 차감도 없다.
 * p_base_revision 이 현재 최신 판과 다르면 STALE_REVISION — 다른 탭에서 먼저 고친 내용을 덮어쓰지 않는다.
 */
create or replace function public.save_interview_pack_user_answer(
  p_owner_user_id uuid,
  p_pack_id uuid,
  p_slot text,
  p_origin text,
  p_base_revision integer,
  p_materials_version integer,
  p_card jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.interview_packs%rowtype;
  current_revision integer;
begin
  if p_origin is null or p_origin not in ('user_edited', 'restored') then
    raise exception 'INVALID_ORIGIN' using errcode = '22023';
  end if;

  select * into target from public.interview_packs
  where id = p_pack_id and owner_user_id = p_owner_user_id for update;
  if target.id is null then
    raise exception 'PACK_NOT_FOUND' using errcode = 'P0002';
  end if;

  select coalesce(max(revision_no), 0) into current_revision
  from public.interview_pack_answers where pack_id = target.id and slot = p_slot;
  if current_revision = 0 then
    raise exception 'ANSWER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if current_revision <> p_base_revision then
    raise exception 'STALE_REVISION' using errcode = '40001';
  end if;

  insert into public.interview_pack_answers (
    pack_id, owner_user_id, slot, revision_no, origin, materials_version, card
  ) values (
    target.id, p_owner_user_id, p_slot, current_revision + 1, p_origin, p_materials_version, p_card
  );
  update public.interview_packs set updated_at = now() where id = target.id;
  return current_revision + 1;
end;
$$;

-- ───────────────────────── 테스트 초기화 ─────────────────────────

/*
 * 테스트 팩만 지운다(admin_test). 실제 구매 건의 팩은 건드리지 않는다.
 * 팩과 함께 자료 버전·답변·사용량이 지워진다. 진행 중이던 작업이 나중에 끝나도 예약이 사라졌으므로
 * 저장 함수가 USAGE_NOT_ACTIVE 로 거절한다. AI 호출 원장(interview_pack_ai_calls)은 남는다.
 */
create or replace function public.delete_admin_test_packs(p_owner_user_id uuid, p_pack_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.interview_packs
  where owner_user_id = p_owner_user_id and id = any (p_pack_ids) and access_source = 'admin_test';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.interview_pack_run_access(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_interview_pack(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.create_admin_snapshot_pack(uuid, jsonb, jsonb, text, uuid) from public, anon, authenticated;
revoke all on function public.save_interview_pack_materials(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.reserve_interview_pack_usage(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.settle_interview_pack_usage(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.save_interview_pack_assessment(uuid, uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public.refresh_interview_pack_assessment(uuid, uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public.save_interview_pack_answers(uuid, uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public.save_interview_pack_user_answer(uuid, uuid, text, text, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.delete_admin_test_packs(uuid, uuid[]) from public, anon, authenticated;

grant execute on function public.interview_pack_run_access(uuid, uuid) to service_role;
grant execute on function public.create_interview_pack(uuid, uuid, jsonb, jsonb) to service_role;
grant execute on function public.create_admin_snapshot_pack(uuid, jsonb, jsonb, text, uuid) to service_role;
grant execute on function public.save_interview_pack_materials(uuid, uuid, jsonb) to service_role;
grant execute on function public.reserve_interview_pack_usage(uuid, uuid, text, text, text) to service_role;
grant execute on function public.settle_interview_pack_usage(uuid, uuid, text, text) to service_role;
grant execute on function public.save_interview_pack_assessment(uuid, uuid, integer, jsonb) to service_role;
grant execute on function public.refresh_interview_pack_assessment(uuid, uuid, integer, jsonb) to service_role;
grant execute on function public.save_interview_pack_answers(uuid, uuid, integer, jsonb) to service_role;
grant execute on function public.save_interview_pack_user_answer(uuid, uuid, text, text, integer, integer, jsonb) to service_role;
grant execute on function public.delete_admin_test_packs(uuid, uuid[]) to service_role;

commit;
