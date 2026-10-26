import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261027010000_research_taxonomy_and_followups.sql", "utf8");

describe("연구 분류·후속 확인 마이그레이션", () => {
  it("비식별 분류축과 14·28일 후속 기준을 저장한다", () => {
    for (const column of ["industry_tags", "role_group", "career_stage", "experience_topics", "improvement_types"]) expect(migration).toContain(column);
    expect(migration).toContain("interval '14 days'");
    expect(migration).toContain("interval '28 days'");
  });

  it("연구 저장은 기존 동의 확인을 유지한다", () => {
    expect(migration).toContain("has_research_consent");
    expect(migration).toContain("to service_role");
  });
});

