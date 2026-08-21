import { describe, expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import { buildQuickAnalysisInstructions } from "./prompt";
import { getAnalysisQuestions, getUnansweredQuestions } from "./questions";

function requestWithDraft(text: string, overrides: Partial<AnalysisRequest> = {}): AnalysisRequest {
  return {
    requestId: "case-1",
    product: "QUICK",
    writingMode: "POLISH",
    writingStyle: "BALANCED",
    targetLength: 700,
    documents: [{ kind: "cover_letter", text }],
    ...overrides,
  };
}

// The draft the applicant actually uploaded: three answered questions plus a
// fourth that only carries the form's instruction line.
const draft = [
  "1. 자신의 지원동기 및 포부에 대해 자세히 작성",
  "대표이사님의 안전리더십에 감명받아 지원했습니다.",
  "2. 회사에 필요한 사람임을 자세히 작성",
  "안전진단 아르바이트로 설비 결함을 찾았습니다.",
  "3. 장점과 단점을 자세히 작성",
  "꼼꼼하게 확인하는 것이 장점입니다.",
  "4. 경력사항은 근무경력위주로 작성",
  " 주특기 업무작성",
].join("\n");

describe("analysis question selection", () => {
  it("numbers answered questions consecutively so prompt and assembly agree", () => {
    const questions = getAnalysisQuestions(requestWithDraft(draft));
    expect(questions.map((question) => question.order)).toEqual([1, 2, 3]);
  });

  it("does not demand a revision for a question that has no answer", () => {
    // The phantom fourth question is what made the model return three
    // revisions while the assembler demanded four, failing every run.
    const questions = getAnalysisQuestions(requestWithDraft(draft));
    expect(questions).toHaveLength(3);
    expect(buildQuickAnalysisInstructions(requestWithDraft(draft))).toContain("총 3개 문항");
  });

  it("reports the unanswered prompt so the result can explain the gap", () => {
    expect(getUnansweredQuestions(requestWithDraft(draft)).map((question) => question.prompt))
      .toEqual(["경력사항은 근무경력위주로 작성"]);
  });

  it("keeps a duplicated heading from inventing an extra question", () => {
    const duplicated = ["1. 지원동기를 작성", "1. 지원동기를 작성", "실제 답변입니다.", "2. 장단점을 작성", "두 번째 답변입니다."].join("\n");
    const questions = getAnalysisQuestions(requestWithDraft(duplicated));
    // The bare duplicate carries no answer, so it never enters the contract.
    expect(questions.map((question) => question.order)).toEqual([1, 2]);
  });

  it("adapts the instruction to the writing mode instead of only labelling it", () => {
    expect(buildQuickAnalysisInstructions(requestWithDraft(draft, { writingMode: "BUILD" }))).toContain("작성 단계: 내용 보완");
    expect(buildQuickAnalysisInstructions(requestWithDraft(draft, { writingMode: "POLISH" }))).toContain("작성 단계: 최종 첨삭");
  });

  it("asks for the PRO-only sections only when the run is PRO", () => {
    expect(buildQuickAnalysisInstructions(requestWithDraft(draft, { product: "PRO" }))).toContain("requirementMatches");
    expect(buildQuickAnalysisInstructions(requestWithDraft(draft))).not.toContain("requirementMatches");
  });
});
