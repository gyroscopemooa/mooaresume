import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260824010000_enable_final_product.sql", "utf8");
const proMigration = readFileSync("supabase/migrations/20260820010000_enable_pro_billing.sql", "utf8");
const previousBegin = readFileSync("supabase/migrations/20260822020000_revision_request_document.sql", "utf8");

describe("FINAL 상품 마이그레이션", () => {
  it("세 표 모두 FINAL을 받아들인다", () => {
    for (const table of ["analysis_runs", "billing_orders", "analysis_entitlements"]) {
      expect(migration).toContain(`add constraint ${table}_product_check check (product in ('QUICK', 'PRO', 'FINAL'))`);
    }
  });

  it("analysis_runs의 기존 제약은 이름이 아니라 정의로 찾아 지운다", () => {
    // A guessed name that does not match drops nothing, and the old constraint
    // keeps rejecting FINAL while the migration reports success.
    expect(migration).toContain("from pg_constraint con");
    expect(migration).toContain("pg_get_constraintdef(con.oid) like '%QUICK%'");
    expect(migration).toContain("drop constraint %I");
  });

  it("결제·시작 경로의 네 관문이 모두 FINAL을 통과시킨다", () => {
    // Each of these raises its own error today, so missing one leaves a paid
    // FINAL run stuck at a different gate than the others.
    const gates = migration.match(/not in \('QUICK', 'PRO', 'FINAL'\)/g) ?? [];
    expect(gates).toHaveLength(4);
    for (const fn of ["prepare_quick_checkout", "register_quick_checkout", "grant_polar_order_entitlement", "begin_quick_analysis"]) {
      expect(migration).toContain(`create or replace function public.${fn}`);
    }
  });

  it("FINAL도 이력서·경력기술서·재요청을 받는다", () => {
    // The whole product is a résumé cross-check. Left at `= 'PRO'`, a paid
    // FINAL run arrives with only the cover letter and the posting and comes
    // back empty without erroring.
    expect(previousBegin).toContain("or target_run.product = 'PRO')");
    expect(migration).toContain("or target_run.product in ('PRO', 'FINAL'))");
    expect(migration).not.toContain("or target_run.product = 'PRO')");
  });

  it("PRO 마이그레이션이 세운 조건을 그대로 유지한다", () => {
    // Re-creating a function is a full replacement: anything dropped here is
    // silently lost, not merged.
    for (const invariant of [
      "target_run.status <> 'PENDING'",
      "ACTIVE_ENTITLEMENT_EXISTS",
      "for update skip locked limit 1",
      "status = 'CONSUMED'",
      "on conflict (provider, provider_event_id) do nothing",
      "on conflict (provider, provider_order_id) do nothing",
      "set search_path = ''",
    ]) {
      expect(proMigration).toContain(invariant);
      expect(migration).toContain(invariant);
    }
  });

  it("이전 begin_quick_analysis의 안전장치를 하나도 잃지 않는다", () => {
    for (const invariant of [
      "ANALYSIS_ATTEMPT_LIMIT_REACHED",
      "target_run.attempt_count >= 3",
      "PRIMARY_DOCUMENT_REQUIRED",
      "ae.allowed_characters >= snapshot_characters",
      "when 'REVISION_REQUEST' then 'revision_request'",
    ]) {
      expect(previousBegin).toContain(invariant);
      expect(migration).toContain(invariant);
    }
  });

  it("한 트랜잭션으로 끝난다", () => {
    expect(migration.trimStart().startsWith("begin;") || migration.includes("\nbegin;")).toBe(true);
    expect(migration.trimEnd().endsWith("commit;")).toBe(true);
  });
});
