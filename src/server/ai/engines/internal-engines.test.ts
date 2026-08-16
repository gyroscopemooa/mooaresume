import { describe, expect, it } from "vitest";
import { analyzeCoverage } from "./coverage-matrix";
import { canUseFact, findUntraceableClaims } from "./evidence-ledger";
import { rankQuestions } from "./question-planner";
import { shouldStopEditing } from "./stop-editing";
import { evaluateInterpretation } from "./interpretation-policy";

describe("internal analysis engines", () => {
  it("uses only sufficiently supported facts", () => {
    const verified = { id: "f1", claim: "품질 시험 수행", sourceIds: ["resume"], status: "VERIFIED" as const, confidence: 0.9 };
    const pending = { id: "f2", claim: "30% 향상", sourceIds: [], status: "NEEDS_VERIFICATION" as const, confidence: 0.8 };
    expect(canUseFact(verified)).toBe(true);
    expect(canUseFact(pending)).toBe(false);
    expect(findUntraceableClaims([verified, pending])).toEqual([pending]);
  });

  it("finds uncovered requirements and repeated experiences", () => {
    const result = analyzeCoverage(
      [{ id: "data", label: "데이터 활용", importance: 0.9 }],
      [{ experienceId: "test-team", requirementId: "data", strength: 0.85, factIds: ["f1"] }],
      ["production", "production"],
    );
    expect(result.missingRequirements[0].requirement.id).toBe("data");
    expect(result.repeatedExperienceIds).toEqual(["production"]);
  });

  it("asks high-gain low-burden non-sensitive questions first", () => {
    const result = rankQuestions([
      { id: "role", prompt: "직접 한 일은?", expectedGain: 0.95, burden: 0.1, sensitive: false },
      { id: "private", prompt: "민감 정보", expectedGain: 1, burden: 0, sensitive: true },
      { id: "tool", prompt: "사용 장비는?", expectedGain: 0.2, burden: 0.1, sensitive: false },
    ], 2);
    expect(result.map((item) => item.id)).toEqual(["role", "tool"]);
  });

  it("stops when rewrite risk outweighs expected improvement", () => {
    expect(shouldStopEditing({ expectedImprovement: 0.1, styleDeviation: 0.5, factRisk: 0.4 }).stop).toBe(true);
  });

  it("suggests a plausible lesson but waits for confirmation", () => {
    const result = evaluateInterpretation({
      id: "i1",
      sourceFactIds: ["convenience-shift"],
      statement: "교대근무를 통해 인수인계의 중요성을 배웠다.",
      status: "PROPOSED",
      addsNewEvent: false,
      addsNewMetric: false,
      isFirstPersonInnerState: true,
    });
    expect(result.maySuggest).toBe(true);
    expect(result.mayUseInFinalDraft).toBe(false);
    expect(result.requiresUserConfirmation).toBe(true);
  });

  it("allows supported meaning without inventing a new result", () => {
    const result = evaluateInterpretation({
      id: "i2",
      sourceFactIds: ["daily-inventory-log"],
      statement: "반복 점검과 기록으로 재고 누락을 관리했다.",
      status: "SUPPORTED",
      addsNewEvent: false,
      addsNewMetric: false,
      isFirstPersonInnerState: false,
    });
    expect(result.mayUseInFinalDraft).toBe(true);
  });
});
