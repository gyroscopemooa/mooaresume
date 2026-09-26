import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 면접 준비팩·테스트 이용권 마이그레이션의 보안 규칙을 글자 수준에서 지키는 회귀 테스트.
 * (동작은 별도로 실제 Postgres 에서 검증했다. 이 테스트는 나중에 누가 SQL 을 고쳐도 아래 원칙이 깨지지 않게 한다.)
 */

const grants = readFileSync(join(process.cwd(), "supabase/migrations/20260926010000_admin_test_grants.sql"), "utf8");
const packs = readFileSync(join(process.cwd(), "supabase/migrations/20260926020000_interview_packs.sql"), "utf8");
const both = `${grants}\n${packs}`;

/** `create [or replace] function public.NAME(...) ... $$ ... $$;` 블록마다 헤더를 뽑는다. */
function functionHeaders(sql: string) {
  const headers: Array<{ name: string; header: string }> = [];
  const pattern = /create (?:or replace )?function public\.(\w+)\(([\s\S]*?)\$\$/g;
  for (const match of sql.matchAll(pattern)) headers.push({ name: match[1], header: match[0] });
  return headers;
}

describe("새 표는 전부 RLS 로 잠겨 있다", () => {
  it("만든 표마다 row level security 를 켠다", () => {
    const tables = [...both.matchAll(/create table public\.(\w+)/g)].map((match) => match[1]);
    expect(tables.sort()).toEqual([
      "admin_test_grant_uses", "admin_test_grants", "admin_test_material_sets", "interview_pack_ai_calls",
      "interview_pack_answers", "interview_pack_materials", "interview_pack_usage", "interview_packs",
    ]);
    for (const table of tables) expect(both, table).toMatch(new RegExp(`alter table public\\.${table}[^;]*enable row level security`));
  });

  it("브라우저(anon)에는 어떤 권한도 주지 않는다", () => {
    expect(both).not.toMatch(/grant [^;]* to [^;]*\banon\b/i);
  });

  it("AI 호출 원장은 브라우저에서 읽지도 쓰지도 못한다", () => {
    expect(packs).toMatch(/revoke all on table public\.interview_pack_ai_calls from anon, authenticated/);
    expect(packs).toMatch(/grant select, insert on table public\.interview_pack_ai_calls to service_role/);
  });
});

describe("함수 권한", () => {
  const headers = functionHeaders(both);

  it("모든 함수가 security definer 이고 search_path 를 비워 둔다", () => {
    expect(headers.map((header) => header.name).sort()).toHaveLength(14);
    for (const { name, header } of headers) {
      expect(header, name).toMatch(/security definer/);
      expect(header, name).toMatch(/set search_path = ''/);
    }
  });

  it("브라우저(authenticated)가 부를 수 있는 함수는 테스트 이용권 사용 하나뿐이다", () => {
    const authenticatedGrants = [...both.matchAll(/grant execute on function public\.(\w+)\([^)]*\) to authenticated/g)].map((match) => match[1]);
    expect(authenticatedGrants).toEqual(["consume_admin_test_grant"]);
  });

  it("발급·회수·팩 쓰기 함수는 service_role 만 실행할 수 있다", () => {
    for (const name of [
      "issue_admin_test_grant", "revoke_admin_test_grant", "create_interview_pack", "create_admin_snapshot_pack",
      "save_interview_pack_materials", "reserve_interview_pack_usage", "settle_interview_pack_usage",
      "save_interview_pack_assessment", "refresh_interview_pack_assessment", "save_interview_pack_answers",
      "save_interview_pack_user_answer", "delete_admin_test_packs",
    ]) {
      expect(both, name).toMatch(new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from public, anon, authenticated`));
      expect(both, name).toMatch(new RegExp(`grant execute on function public\\.${name}\\([^)]*\\) to service_role`));
    }
  });
});

describe("가짜 결제를 만들지 않는다", () => {
  it("결제 주문·영수증·환불 표를 쓰거나 바꾸지 않는다", () => {
    expect(both).not.toMatch(/insert into public\.billing_orders/);
    expect(both).not.toMatch(/update public\.billing_orders/);
    expect(both).not.toMatch(/delete from public\.billing_orders/);
    // 읽기(권한 판정을 위한 order 상태·제공자 조회)는 괜찮다. 이 표들에 쓰는 문장이 없다는 뜻이다.
    expect(both).not.toMatch(/(?:insert into|update|delete from)\s+public\.(?:billing_webhook_events|reward_credits|checkout_intents|billing_orders)/);
  });

  it("이용권은 주문 없이 테스트 출처로만 만들고, 출처는 정확히 하나여야 한다", () => {
    expect(grants).toMatch(/analysis_entitlements_single_source/);
    expect(grants).toMatch(/billing_order_id is not null and test_grant_id is null/);
    expect(grants).toMatch(/billing_order_id is null and test_grant_id is not null/);
  });

  it("begin_quick_analysis 등 기존 결제·분석 함수를 다시 정의하지 않는다", () => {
    for (const name of ["begin_quick_analysis", "grant_polar_order_entitlement", "consume_reward_credit", "prepare_quick_checkout", "fail_quick_analysis"]) {
      expect(both, name).not.toMatch(new RegExp(`function public\\.${name}\\b`));
    }
  });
});

describe("테스트 구분과 안전장치", () => {
  it("스냅샷 팩은 항상 admin_test 출처이고, 테스트 여부는 서버가 계산한 열이다", () => {
    expect(packs).toMatch(/origin <> 'admin_snapshot' or access_source = 'admin_test'/);
    expect(packs).toMatch(/is_test boolean generated always as \(access_source = 'admin_test'\) stored/);
  });

  it("사용량 예약은 팩 행을 잠그고 요청 키 중복을 막는다", () => {
    expect(packs).toMatch(/from public\.interview_packs\s+where id = p_pack_id and owner_user_id = p_owner_user_id for update/);
    expect(packs).toMatch(/unique \(pack_id, request_key\)/);
  });

  it("AI 호출 원장의 pack_id 는 팩이 지워져도 남도록 set null 이다(초기화로 한도가 리셋되지 않음)", () => {
    expect(packs).toMatch(/pack_id uuid references public\.interview_packs\(id\) on delete set null/);
  });

  it("시간 비교는 세션 시간대에 영향받지 않게 now() 를 쓴다", () => {
    expect(both).not.toMatch(/timezone\('utc', now\(\)\)/);
  });
});
