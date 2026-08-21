import { describe, expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import type { QuickAnalysisOutput } from "./schema";
import { validateQuickAnalysis } from "./validator";

const output = (revisedAnswer: string, evidenceQuote: string): QuickAnalysisOutput => ({
  schemaVersion: "1.0",
  readiness: { score: 70, label: "보완 권장", summary: "경험을 구체화할 수 있습니다.", reasons: ["제공한 경험이 있습니다."] },
  priorities: [{ title: "경험을 연결하세요.", description: "제공 자료의 사실을 활용하세요.", category: "evidence", severity: "high", evidenceQuote }],
  revision: {
    revisedAnswer,
    highlightedPhrases: ["고객 응대"],
    originalAnnotations: [],
    reasons: [{ reason: "사용자 제공 경험을 지원 동기와 연결했습니다.", evidenceQuote, category: "qualitative" }],
    verificationNote: "근무 기간의 증빙 여부는 확인이 필요합니다.",
  },
  verificationQuestions: [],
});

const proRequest: AnalysisRequest = {
  requestId: "pro-supporting-facts",
  product: "PRO",
  writingMode: "BUILD",
  writingStyle: "BALANCED",
  targetLength: 500,
  documents: [
    { kind: "cover_letter", text: "고객 응대 경험을 바탕으로 서비스 직무에 지원합니다." },
    { kind: "portfolio", text: "[자유 메모]\n캐나다 워킹홀리데이 1년, 토론토 매장에서 고객 응대와 계산 업무를 했습니다." },
    { kind: "job_posting", text: "해외 매장 근무 3년 이상 우대" },
  ],
};

describe("PRO supporting-material validation", () => {
  it("accepts a period and evidence supplied in the applicant's additional material", () => {
    const issues = validateQuickAnalysis(
      proRequest,
      output("캐나다 워킹홀리데이 1년 동안 고객 응대와 계산 업무를 수행했습니다.", "캐나다 워킹홀리데이 1년"),
    );

    expect(issues.filter((issue) => issue.code === "NEW_NUMBER" || issue.code === "INVALID_EVIDENCE")).toEqual([]);
  });

  it("does not treat a job-posting requirement as a candidate fact", () => {
    const issues = validateQuickAnalysis(
      proRequest,
      output("해외 매장에서 3년 동안 고객 응대 경험을 쌓았습니다.", "해외 매장 근무 3년 이상"),
    );

    expect(issues.some((issue) => issue.code === "NEW_NUMBER")).toBe(true);
    expect(issues.some((issue) => issue.code === "INVALID_EVIDENCE")).toBe(true);
  });

  it("keeps QUICK limited to the cover-letter source", () => {
    const quickRequest: AnalysisRequest = { ...proRequest, product: "QUICK" };
    const issues = validateQuickAnalysis(
      quickRequest,
      output("캐나다 워킹홀리데이 1년 동안 고객 응대와 계산 업무를 수행했습니다.", "캐나다 워킹홀리데이 1년"),
    );

    expect(issues.some((issue) => issue.code === "NEW_NUMBER")).toBe(true);
    expect(issues.some((issue) => issue.code === "INVALID_EVIDENCE")).toBe(true);
  });
});