import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260830010000_reference_material_budget.sql", "utf8");

describe("참고자료 총량 상한 마이그레이션", () => {
  it("자소서는 절대 자르거나 빼지 않는다", () => {
    // It is what was bought, and a silently shortened 자소서 produces a silently
    // wrong 첨삭.
    expect(migration).toContain("where purpose = 'PRIMARY' or spent <= reference_budget");
    expect(migration).toContain("case when purpose = 'PRIMARY' then 0 else");
  });

  it("문서 하나와 총량, 두 가지로 막는다", () => {
    // One limit is not enough: a single 300-page portfolio and twenty small
    // files arrive at the same bill by different routes.
    expect(migration).toContain("per_document_limit := 20000");
    expect(migration).toContain("left(v.normalized_text, per_document_limit)");
    expect(migration).toContain("reference_budget := 20000");
    expect(migration).toContain("reference_budget := 60000");
  });

  it("무료 이용권은 참고자료만 절반이다", () => {
    // Halving the letter itself would break the referral promise that a friend
    // gets "같은 상품의 이용권".
    expect(migration).toContain("per_document_limit := per_document_limit / 2");
    expect(migration).toContain("reference_budget := reference_budget / 2");
    expect(migration).not.toContain("snapshot_characters / 2");
  });

  it("결제 여부를 주문 금액으로 가린다", () => {
    // A reward credit books an order of zero.
    expect(migration).toContain("coalesce(bo.amount, 0) > 0 into paid");
    expect(migration).toContain("paid := coalesce(paid, false);");
  });

  it("예산은 중요한 자료부터 쓴다", () => {
    // The posting the analysis compares against outranks a certificate scan, so
    // 기타 증빙 is what falls off the end.
    const order = ["'JOB_POSTING' then 1", "'RESUME' then 2", "'CAREER_DOCUMENT' then 3", "'PORTFOLIO' then 5"];
    for (const rank of order) expect(migration).toContain(rank);
    expect(migration).toContain("order by priority, created_at");
  });

  it("기존 보호 장치를 그대로 들고 간다", () => {
    for (const invariant of [
      "ANALYSIS_RUN_NOT_FOUND",
      "ANALYSIS_ATTEMPT_LIMIT_REACHED",
      "PRIMARY_DOCUMENT_REQUIRED",
      "ACTIVE_ENTITLEMENT_NOT_FOUND",
      "ae.allowed_characters >= snapshot_characters",
      "for update skip locked",
      "status = 'CONSUMED'",
    ]) {
      expect(migration, invariant).toContain(invariant);
    }
    // FINAL must keep reading supporting documents — the fifth place a bare PRO
    // check once excluded it.
    expect(migration).toContain("target_run.product in ('PRO', 'FINAL')");
  });
});
