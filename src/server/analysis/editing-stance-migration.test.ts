import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260824030000_editing_stance.sql", "utf8");
const originalPlan = readFileSync("supabase/migrations/20260816153000_analysis_runs_and_results.sql", "utf8");
const finalMigration = readFileSync("supabase/migrations/20260824010000_enable_final_product.sql", "utf8");

describe("첨삭 방향 마이그레이션", () => {
  it("세 방향만 허용하고 기본값은 균형형이다", () => {
    expect(migration).toContain("editing_stance text not null default 'BALANCED'");
    expect(migration).toContain("check (editing_stance in ('SAFE', 'BALANCED', 'CONVICTION'))");
  });

  it("고른 방향이 실행에 저장된다", () => {
    expect(migration).toContain("coalesce(nullif(p_plan->>'editingStance', ''), 'BALANCED')");
  });

  it("저장한 방향이 분석 요청으로 다시 나온다", () => {
    // Written at checkout and never read would mean the applicant pays for a
    // choice that silently does nothing.
    expect(migration).toContain("'editingStance', target_run.editing_stance");
  });

  it("옮겨 적은 두 함수의 기존 동작을 잃지 않는다", () => {
    // Both are full replacements: anything dropped here is gone, not merged.
    for (const invariant of ["AUTHENTICATION_REQUIRED", "DOCUMENT_REQUIRED", "'최초 분석 입력'", "security invoker", "grant execute on function public.create_application_case_from_plan(jsonb) to authenticated"]) {
      expect(originalPlan).toContain(invariant);
      expect(migration).toContain(invariant);
    }
    for (const invariant of ["not in ('QUICK', 'PRO', 'FINAL')", "or target_run.product in ('PRO', 'FINAL'))", "ANALYSIS_ATTEMPT_LIMIT_REACHED", "for update skip locked limit 1"]) {
      expect(finalMigration).toContain(invariant);
      expect(migration).toContain(invariant);
    }
  });

  it("FINAL 마이그레이션 뒤에 실행된다", () => {
    // It re-creates begin_quick_analysis, so running first would undo FINAL.
    expect("20260824030000" > "20260824010000").toBe(true);
  });
});
