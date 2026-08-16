import { describe, expect, it } from "vitest";
import { analysisResultSchema } from "./analysis";

const validResult = {
  schemaVersion: "1.0",
  overallReadiness: 82,
  summary: "기본 구조는 탄탄하지만 공고와의 연결 근거를 보완해야 합니다.",
  scores: { questionFit: 91, specificity: 72, logic: 84, readability: 87, persuasiveness: 79 },
  priorityIssues: [{ id: "issue-1", title: "기업 연결 부족", explanation: "지원동기가 일반적입니다.", action: "공고의 공정 개선 요구와 연결하세요.", severity: "high", category: "qualitative", evidence: [{ source: "resume", quote: "생산 경쟁력 향상에 기여하고 싶습니다." }] }],
  strengths: ["문항 요구에 맞는 구조"],
  verificationQuestions: ["개선 결과를 확인할 수 있는 수치가 있나요?"],
} as const;

describe("analysisResultSchema", () => {
  it("accepts an evidence-based result", () => expect(analysisResultSchema.safeParse(validResult).success).toBe(true));
  it("rejects readiness scores outside the rubric", () => expect(analysisResultSchema.safeParse({ ...validResult, overallReadiness: 101 }).success).toBe(false));
  it("limits priority issues to the top three", () => expect(analysisResultSchema.safeParse({ ...validResult, priorityIssues: Array(4).fill(validResult.priorityIssues[0]) }).success).toBe(false));
});
