import { describe, expect, it } from "vitest";
import { analysisRequestSchema, type AnalysisRequest } from "@/application/analysis-contract";
import { applyRevisionReview, matchPreviousRevision, revisionFingerprints, revisionReviewSchema, type RevisionReview } from "./revision-quality";
import { createQuickAnalysisResult } from "./provider";
import { BLOCKING_VALIDATION_CODES, validateQuickAnalysis } from "./validator";
import type { QuickGatewayResult } from "./openai-responses-gateway";
import { quickAnalysisOutputSchema } from "./schema";

const original = "원칙을 양보하는 대신 아이가 포기하지 않도록 곁에서 도왔습니다.";
const revised = "원칙을 지키면서 아이가 포기하지 않도록 곁에서 도왔습니다.";
export const qualityTestRequest: AnalysisRequest = { requestId: "quality-case", product: "QUICK", writingMode: "POLISH", writingStyle: "BALANCED", targetLength: 500, documents: [{ kind: "cover_letter", text: original }] };
export function qualityTestCandidate(answer = revised): QuickGatewayResult {
  return { output: { schemaVersion: "1.0", readiness: { score: 70, label: "검토", summary: "원칙 준수와 도움을 설명했습니다.", reasons: [original] }, priorities: [], verificationQuestions: [], consultingAdvice: [], revision: { originalAnnotations: [], subheading: null, lengthNote: null, revisedAnswer: answer, highlightedPhrases: [], reasons: [], verificationNote: null } }, execution: { responseId: "writer", model: "test", promptVersion: "quick-3.4", rubricVersion: "quick-rubric-1.0", schemaVersion: "1.0", inputTokens: 10, outputTokens: 20, totalTokens: 30 } };
}
export function qualityTestReview(): RevisionReview {
  return { diagnosis: { readiness: qualityTestCandidate().output.readiness, priorities: [], verificationQuestions: [] }, questions: [{ order: 1, before: { questionFit: 3, evidence: 3, logic: 3, readability: 3, specificity: 3 }, after: { questionFit: 3, evidence: 3, logic: 3, readability: 4, specificity: 3 }, meaningfulImprovement: true, newError: false, lostFactOrVoice: false, reintroducedIssue: false, preferenceOnly: false, reason: "실제 전달력 개선을 확인했습니다.", sourceQuote: original, candidateQuote: revised, previousErrorQuote: null, validAnnotationIndexes: [] }], crossQuestionRegression: false, validAdviceIndexes: [] };
}
const reviewer = { responseId: "reviewer", model: "test" };
const apply = (review: RevisionReview, request = qualityTestRequest, candidate = qualityTestCandidate()) => applyRevisionReview(request, candidate, review, reviewer);

describe("independent revision adoption", () => {
  it.each(["QUICK", "PRO", "FINAL"] as const)("adopts evidenced improvement for %s", product => {
    const result = apply(qualityTestReview(), { ...qualityTestRequest, product });
    expect(result.revisionQuality?.decision).toBe("adopt");
    expect(result.output.revision.revisedAnswer).toBe(revised);
    expect(result.output.readiness.score).toBe(75); // input score, never inflated by revision
  });
  it.each(["newError", "lostFactOrVoice", "reintroducedIssue", "preferenceOnly"] as const)("rejects %s without hiding remaining problems", flag => {
    const review = qualityTestReview(); review.questions[0][flag] = true;
    review.diagnosis.verificationQuestions = ["실제 담당 범위를 확인하세요."];
    const result = apply(review);
    expect(result.output.revision.revisedAnswer).toBe(original);
    expect(result.output.revision.reasons).toEqual([]);
    expect(result.output.verificationQuestions).toHaveLength(1);
  });
  it("rejects a weaker dimension even when the total improves", () => {
    const review = qualityTestReview(); review.questions[0].after.logic = 2; review.questions[0].after.evidence = 4;
    expect(apply(review).revisionQuality?.decision).toBe("keep_current");
  });
  it("requires real quotation evidence, not the evaluator's assertion", () => {
    const review = qualityTestReview(); review.questions[0].sourceQuote = "원문에 없는 모순";
    expect(apply(review).revisionQuality?.decision).toBe("keep_current");
  });
  it("rejects cross-question regression and missing evaluation coverage", () => {
    const review = qualityTestReview(); review.crossQuestionRegression = true;
    expect(apply(review).revisionQuality?.decision).toBe("keep_current");
    review.questions[0].order = 2;
    expect(() => apply(review)).toThrow("QUESTION_MISMATCH");
  });
  it("accepts unchanged strong input with zero issues through storage schema", () => {
    const candidate = qualityTestCandidate(original);
    const review = qualityTestReview(); review.questions[0].meaningfulImprovement = false;
    const result = apply(review, qualityTestRequest, candidate);
    expect(quickAnalysisOutputSchema.safeParse(result.output).success).toBe(true);
    const stored = createQuickAnalysisResult(qualityTestRequest, result);
    expect(stored.priorities).toEqual([]);
    expect(stored.questions[0].revisionReasons).toEqual([]);
    expect(stored.consultingAdvice).toEqual([]);
  });
  it("ten preference-only rewrites retain the original instead of ping-pong", () => {
    let text = original;
    for (let i = 0; i < 10; i++) {
      const request = { ...qualityTestRequest, documents: [{ kind: "cover_letter" as const, text }] };
      const review = qualityTestReview(); review.questions[0].preferenceOnly = true;
      text = apply(review, request).output.revision.revisedAnswer;
      expect(text).toBe(original);
    }
  });
  it("previous MOOA text is not immune to real correction", () => {
    const previous = createQuickAnalysisResult(qualityTestRequest, apply(qualityTestReview()));
    const request = { ...qualityTestRequest, previousRevision: { runId: "old", relationship: "previous_revision" as const, result: previous } };
    const correction = qualityTestReview(); correction.questions[0].previousErrorQuote = original;
    expect(apply(correction, request).revisionQuality?.decision).toBe("adopt");
    expect(validateQuickAnalysis(request, qualityTestCandidate("성과를 99% 높였습니다.").output).some(x => BLOCKING_VALIDATION_CODES.has(x.code))).toBe(true);
  });
  it("requires a quoted prior error before an exact B-to-A reversal", () => {
    const previous = createQuickAnalysisResult(qualityTestRequest, apply(qualityTestReview()));
    const request = { ...qualityTestRequest, documents: [{ kind: "cover_letter" as const, text: revised }], previousRevision: { runId: "old", relationship: "previous_revision" as const, result: previous } };
    const review = qualityTestReview(); review.questions[0].sourceQuote = revised; review.questions[0].candidateQuote = original;
    review.questions[0].before.readability = 4; review.questions[0].after.evidence = 4;
    expect(apply(review, request, qualityTestCandidate(original)).revisionQuality?.decision).toBe("keep_current");
    review.questions[0].previousErrorQuote = revised;
    expect(apply(review, request, qualityTestCandidate(original)).revisionQuality?.decision).toBe("adopt");
  });
  it("does not deliver an empty source when CREATE/BUILD was rejected", () => {
    const request = { ...qualityTestRequest, product: "PRO" as const, writingMode: "BUILD" as const, questions: [{ id: "q", title: "경험", prompt: "경험을 설명하세요", answer: "", targetLength: 500 }] };
    const review = qualityTestReview(); review.questions[0].newError = true;
    expect(() => apply(review, request)).toThrow("EMPTY_FALLBACK");
  });
  it("blocks unexplained score drops without silently raising the score", () => {
    const previous = createQuickAnalysisResult(qualityTestRequest, apply(qualityTestReview()));
    const request = { ...qualityTestRequest, documents: [{ kind: "cover_letter" as const, text: revised }], previousRevision: { runId: "old", relationship: "previous_revision" as const, result: previous } };
    expect(() => apply(qualityTestReview(), request)).toThrow("UNEXPLAINED_SCORE_DRIFT");
  });
  it("blocks unexplained core priority changes on identical input", () => {
    const previous = createQuickAnalysisResult(qualityTestRequest, apply(qualityTestReview()));
    const request = { ...qualityTestRequest, previousRevision: { runId: "old", relationship: "same_input" as const, result: previous } };
    const review = qualityTestReview(); review.diagnosis.priorities = [{ title: "새 진단", description: "새 진단", category: "evidence", severity: "high", evidenceQuote: original }];
    expect(() => apply(review, request)).toThrow("UNEXPLAINED_DIAGNOSIS_DRIFT");
    review.questions[0].previousErrorQuote = original;
    expect(apply(review, request).output.priorities).toHaveLength(1);
  });
  it("verifies review schema and does not require issue arrays to be populated", () => {
    expect(revisionReviewSchema.safeParse(qualityTestReview()).success).toBe(true);
  });
});

describe("exact owner-history context matching", () => {
  const stored = () => createQuickAnalysisResult(qualityTestRequest, apply(qualityTestReview()));
  it("matches same input and exact delivered revision, ignoring line endings", () => {
    const history = [{ runId: "old", result: stored() }];
    expect(matchPreviousRevision(qualityTestRequest, history)?.relationship).toBe("same_input");
    const next = { ...qualityTestRequest, documents: [{ kind: "cover_letter" as const, text: revised.replaceAll(" ", "\r\n") }] };
    expect(matchPreviousRevision(next, history)?.relationship).toBe("previous_revision");
  });
  it("does not anchor changed facts, materials, mode, style, stance or product", () => {
    const history = [{ runId: "old", result: stored() }];
    for (const patch of [{ product: "PRO" as const }, { writingMode: "BUILD" as const }, { editingStance: "SAFE" as const }]) {
      expect(matchPreviousRevision({ ...qualityTestRequest, ...patch }, history)).toBeUndefined();
    }
    expect(matchPreviousRevision({ ...qualityTestRequest, documents: [{ kind: "cover_letter", text: revised + " 새 사실" }] }, history)).toBeUndefined();
    expect(revisionFingerprints({ ...qualityTestRequest, requestId: "another-case" })).toEqual(revisionFingerprints(qualityTestRequest));
  });
  it("ignores client-supplied lineage and unversioned legacy results", () => {
    expect(analysisRequestSchema.parse({ ...qualityTestRequest, previousRevision: { runId: "other-user" } })).not.toHaveProperty("previousRevision");
    const result = stored(); delete result.revisionQuality;
    expect(matchPreviousRevision(qualityTestRequest, [{ runId: "old", result }])).toBeUndefined();
  });
});
