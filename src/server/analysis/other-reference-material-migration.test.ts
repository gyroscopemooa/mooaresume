import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260924010000_include_other_reference_materials.sql", "utf8");

describe("기타 참고자료 실행 스냅샷", () => {
  it("PRO·FINAL은 OTHER를 입력으로 받고 모델에 other로 전달한다", () => {
    expect(migration).toContain("when 'OTHER' then 8");
    expect(migration).toContain("when 'OTHER' then 'other'");
    expect(migration).toContain("d.kind not in ('OTHER', 'REVISION_REQUEST', 'APPLICANT_NOTE') or target_run.product in ('PRO', 'FINAL')");
  });
});
