import { describe, expect, it } from "vitest";
import { buildResearchTaxonomy } from "./research-taxonomy";
import type { ResultDocument } from "./result-document";

function result(): ResultDocument {
  return {
    schemaVersion: "1.0", caseId: "case", product: "PRO", writingMode: "POLISH", isSample: false,
    company: "자동차 부품 제조사", role: "생산 품질관리", applicationLabel: "지원서", analyzedAt: new Date().toISOString(),
    analysisRun: { provider: "mock", responseId: null, model: "mock", promptVersion: "1", rubricVersion: "1", schemaVersion: "1", inputTokens: null, outputTokens: null, totalTokens: null },
    readiness: { score: 70, label: "보완 필요", summary: "요약", reasons: ["근거"] }, attachments: [],
    candidateProfile: { snapshotLabel: "지원자", items: [{ id: "p1", category: "career", label: "경력", value: "품질관리 3년", needsVerification: false }] },
    priorities: [{ id: "x", title: "성과 근거", description: "수치가 필요", category: "evidence", severity: "high" }],
    questions: [{ id: "q", order: 1, title: "경험", prompt: "질문", targetLength: 500, originalAnswer: "팀과 협업해 불량 원인을 분석하고 공정을 개선했습니다.", revisedAnswer: "부서와 조율해 불량 건수를 줄였습니다.", highlightedPhrases: [], revisionReasons: [] }],
    requirementMatches: [{ id: "r", requirement: "생산 공정 개선", status: "matched", evidence: "근거", recommendation: "권장", origin: "stated", postingQuote: null }],
    verificationQuestions: [], editSummary: [], consultingAdvice: [], interviewQuestions: [], interviewRisks: [], careerTimeline: [], documentConflicts: [], interviewerFlags: [], finalChecklist: [], suppliedResume: true, rejectionRisks: [], reviewerNotes: [], claimEvidence: [], firstImpression: null, answerStructures: [], coverageNotes: [],
  };
}

describe("연구 태그", () => {
  it("개인 식별값 대신 산업·직무·경력·경험·개선 유형을 정규화한다", () => {
    expect(buildResearchTaxonomy(result())).toEqual(expect.objectContaining({
      industryTags: expect.arrayContaining(["제조·생산"]), roleGroup: "생산·품질·안전", careerStage: "경력",
      experienceTopics: expect.arrayContaining(["문제해결", "협업·조율"]), improvementTypes: ["근거·성과 보강"],
    }));
  });
});
