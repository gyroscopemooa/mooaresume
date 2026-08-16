import { describe, expect, it } from "vitest";
import type { QuickAnalysisOutput } from "@/server/ai/quick/schema";
import { quickEvalFixtures } from "@/fixtures/quick-eval-cases";
import { evaluateQuickOutput, summarizeQuickEval } from "./quick-eval";

const fixture = quickEvalFixtures[0];

function passingOutput(): QuickAnalysisOutput {
  return {
    schemaVersion: "1.0",
    readiness: {
      score: 70,
      label: "보완 권장",
      summary: "교대근무 경험은 확인되지만 구체적인 인수인계 행동은 보완이 필요합니다.",
      reasons: ["8개월 동안 교대근무를 한 사실이 제시되어 있습니다."],
    },
    priorities: [{
      title: "인수인계 행동을 구체화하세요.",
      description: "실제로 전달한 정보와 방식을 확인하면 경험의 근거가 선명해집니다.",
      category: "evidence",
      severity: "high",
      evidenceQuote: "교대근무",
    }],
    revision: {
      revisedAnswer: "편의점 야간 아르바이트를 8개월 하며 교대근무를 경험했습니다.",
      highlightedPhrases: ["교대근무"],
      reasons: [{
        reason: "제공된 기간과 경험을 유지해 핵심 사실을 분명히 했습니다.",
        evidenceQuote: "8개월",
        category: "objective",
      }],
      verificationNote: "인수인계 시 전달한 정보는 추가 확인이 필요합니다.",
    },
    verificationQuestions: ["인수인계 시 실제로 어떤 정보를 전달했나요?"],
  };
}

describe("QUICK Korean eval fixtures", () => {
  it("contains 12 unique cases covering every writing mode and style", () => {
    expect(quickEvalFixtures).toHaveLength(12);
    expect(new Set(quickEvalFixtures.map((item) => item.id)).size).toBe(12);
    expect(new Set(quickEvalFixtures.map((item) => item.writingMode))).toEqual(
      new Set(["CREATE", "BUILD", "POLISH"]),
    );
    expect(new Set(quickEvalFixtures.map((item) => item.writingStyle))).toEqual(
      new Set(["CONCISE", "BALANCED", "STRENGTH_FOCUSED"]),
    );
  });

  it("passes a fact-preserving output with the required verification", () => {
    const result = evaluateQuickOutput(fixture, passingOutput());
    expect(result.passed).toBe(true);
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  it("rejects malformed machine output", () => {
    const result = evaluateQuickOutput(fixture, { schemaVersion: "1.0" });
    expect(result.passed).toBe(false);
    expect(result.checks).toEqual([
      expect.objectContaining({ code: "SCHEMA_INVALID", passed: false }),
    ]);
  });

  it("detects invented claims, lost facts, missing questions, and missing priorities", () => {
    const value = passingOutput();
    value.revision.revisedAnswer = "편의점 근무 중 재고 오류를 줄였습니다.";
    value.revision.highlightedPhrases = [];
    value.revision.verificationNote = null;
    value.verificationQuestions = [];
    value.priorities[0].category = "clarity";

    const result = evaluateQuickOutput(fixture, value);
    const failedCodes = result.checks
      .filter((check) => !check.passed)
      .map((check) => check.code);

    expect(failedCodes).toEqual(expect.arrayContaining([
      "FORBIDDEN_CLAIM",
      "MISSING_PRESERVED_FACT",
      "MISSING_VERIFICATION",
      "MISSING_PRIORITY",
    ]));
  });

  it("detects an evidence quote that is absent from the source", () => {
    const value = passingOutput();
    value.priorities[0].evidenceQuote = "재고관리 개선";

    const result = evaluateQuickOutput(fixture, value);
    expect(result.checks).toContainEqual(expect.objectContaining({
      code: "INVALID_EVIDENCE",
      passed: false,
    }));
  });

  it("summarizes case-level failures", () => {
    const passed = evaluateQuickOutput(fixture, passingOutput());
    const failed = evaluateQuickOutput(fixture, { schemaVersion: "1.0" });
    const summary = summarizeQuickEval([passed, failed]);

    expect(summary).toMatchObject({
      total: 2,
      passed: 1,
      failed: 1,
      passRate: 0.5,
    });
    expect(summary.failures[0]).toMatchObject({
      caseId: fixture.id,
      code: "SCHEMA_INVALID",
    });
  });
});
