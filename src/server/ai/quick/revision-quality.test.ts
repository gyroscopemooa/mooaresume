import { describe, expect, it } from "vitest";
import { analysisRequestSchema, type AnalysisRequest } from "@/application/analysis-contract";
import { applyRevisionReview, matchPreviousRevision, quoteAppearsIn, revisionFingerprints, revisionReviewSchema, type RevisionReview } from "./revision-quality";
import { createQuickAnalysisResult } from "./provider";
import { BLOCKING_VALIDATION_CODES, validateQuickAnalysis } from "./validator";
import type { QuickGatewayResult } from "./openai-responses-gateway";
import { quickAnalysisOutputSchema } from "./schema";
import { stabilityQuestions } from "@/fixtures/quick-stability-case";

const original = "원칙을 양보하는 대신 아이가 포기하지 않도록 곁에서 도왔습니다.";
const revised = "원칙을 지키면서 아이가 포기하지 않도록 곁에서 도왔습니다.";
export const qualityTestRequest: AnalysisRequest = { requestId: "quality-case", product: "QUICK", writingMode: "POLISH", writingStyle: "BALANCED", targetLength: 500, documents: [{ kind: "cover_letter", text: original }] };
export function qualityTestCandidate(answer = revised): QuickGatewayResult {
  return { output: { schemaVersion: "1.0", readiness: { score: 70, label: "검토", summary: "원칙 준수와 도움을 설명했습니다.", reasons: [original] }, priorities: [], verificationQuestions: [], consultingAdvice: [], revision: { originalAnnotations: [], subheading: null, lengthNote: null, revisedAnswer: answer, highlightedPhrases: [], reasons: [], verificationNote: null } }, execution: { responseId: "writer", model: "test", promptVersion: "quick-3.4", rubricVersion: "quick-rubric-1.0", schemaVersion: "1.0", inputTokens: 10, outputTokens: 20, totalTokens: 30 } };
}
export function qualityTestReview(): RevisionReview {
  return { diagnosis: { readiness: qualityTestCandidate().output.readiness, priorities: [], verificationQuestions: [] }, questions: [{ order: 1, before: { questionFit: 3, evidence: 3, logic: 3, readability: 3, specificity: 3 }, after: { questionFit: 3, evidence: 3, logic: 3, readability: 4, specificity: 3 }, meaningfulImprovement: true, newError: false, lostFactOrVoice: false, reintroducedIssue: false, preferenceOnly: false, reason: "실제 전달력 개선을 확인했습니다.", sourceQuote: original, candidateQuote: revised, previousErrorQuote: null, validAnnotationIndexes: [], validLengthNote: false }], crossQuestionRegression: false, crossQuestionOrders: [], validAdviceIndexes: [], adviceCorrections: [] };
}
const reviewer = { responseId: "reviewer", model: "test" };
const apply = (review: RevisionReview, request = qualityTestRequest, candidate = qualityTestCandidate()) => applyRevisionReview(request, candidate, review, reviewer);

describe("independent revision adoption", () => {
  it("corrects advice that falsely describes a rejected edit as completed", () => {
    const candidate = qualityTestCandidate();
    candidate.output.consultingAdvice = [{ kind: "clarify", title: "문맥 확인", guidance: "삭제한 문장을 확인하세요.", rationale: original, priority: "low" }];
    const review = qualityTestReview();
    review.questions[0].lostFactOrVoice = true;
    review.validAdviceIndexes = [0];
    review.adviceCorrections = [{ index: 0, guidance: "원문의 해당 표현을 정리할 경우 의미를 유지해 주세요." }];
    const result = apply(review, qualityTestRequest, candidate);
    expect(result.output.revision.revisedAnswer).toBe(original);
    expect(result.output.consultingAdvice?.[0].guidance).toContain("정리할 경우");
  });
  it("discloses URL-only posting analysis and removes unsupported requirement matches", () => {
    const candidate = qualityTestCandidate();
    candidate.output.requirementMatches = [{ requirement: "확인되지 않은 조건", status: "missing", evidence: "없음", recommendation: "확인" }];
    const result = createQuickAnalysisResult({ ...qualityTestRequest, product: "PRO", documents: [...qualityTestRequest.documents, { kind: "job_posting", text: "https://example.com/jobs" }] }, candidate);
    expect(result.requirementMatches).toEqual([]);
    expect(result.coverageNotes.join(" ")).toContain("채용공고 본문이 없는 상태");
  });
  it("adopts only passing questions and keeps valid clarification notes on rejected ones", () => {
    const request = { ...qualityTestRequest, writingMode: "BUILD" as const, questions: Array.from({ length: 6 }, (_, i) => ({ id: String(i), title: "경험", prompt: "경험을 설명하세요.", targetLength: 500, answer: original })) };
    const candidate = qualityTestCandidate();
    candidate.output.revisions = Array.from({ length: 6 }, (_, i) => ({ ...candidate.output.revision, questionOrder: i + 1, lengthNote: "실제 담당한 역할은 무엇인가요?" }));
    const review = qualityTestReview();
    review.questions = Array.from({ length: 6 }, (_, i) => ({ ...review.questions[0], order: i + 1, lostFactOrVoice: i > 0, validLengthNote: i === 1 }));
    const result = apply(review, request, candidate);
    expect(result.output.revisions?.map(q => q.revisedAnswer)).toEqual([revised, original, original, original, original, original]);
    expect(result.output.revisions?.[1].lengthNote).toBe("실제 담당한 역할은 무엇인가요?");
    expect(result.output.revisions?.[2].lengthNote).toBeNull();
    expect(result.revisionQuality?.decision).toBe("adopt");
    expect(quickAnalysisOutputSchema.safeParse(result.output).success).toBe(true);
    expect(() => createQuickAnalysisResult(request, result)).not.toThrow();
  });
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

describe("tolerant quotation grounding", () => {
  const text = "지역 경제의 기반은 보고서가 아니라 현장에 있다는 것을 체감했습니다. 이때부터 '공공 개발' 업무에 관심을 갖게 되었습니다.";

  it("accepts a quote that differs only in spacing, quote marks or punctuation", () => {
    expect(quoteAppearsIn(text, "지역 경제의 기반은 보고서가 아니라 현장에 있다는 것을 체감했습니다")).toBe(true);
    expect(quoteAppearsIn(text, "지역경제의 기반은  보고서가 아니라 현장에 있다는 것을 체감했습니다.")).toBe(true);
    expect(quoteAppearsIn(text, "이때부터 “공공 개발” 업무에 관심을 갖게 되었습니다")).toBe(true);
    expect(quoteAppearsIn(text, "이때부터 공공개발 업무에 관심을 갖게 되었습니다.")).toBe(true);
  });

  it("accepts the shape real reviews used: two sentences from the answer joined with \" ... \"", () => {
    // 실제 검토 응답에서 글자 그대로 일치하지 않아 거절된 9개 인용이 모두 이 모양(떨어진 두 구절을 말줄임표로 이음)이었다.
    const answer = stabilityQuestions[4].answer;
    expect(quoteAppearsIn(answer, "대부분의 지방 상권은 유동인구가 줄고 청년 창업은 거의 불가능한 상태가 되었습니다. ... 상권이 반드시 살아날 것입니다.")).toBe(true);
    expect(quoteAppearsIn(answer, "대부분의 지방 상권은 유동인구가 줄고 청년 창업은 거의 불가능한 상태가 되었습니다. … 공공이 임대료 안정 구역을 지정하고 컨설팅을 지원하면 상권이 반드시 살아날 것입니다.")).toBe(true);
    // 앞뒤 순서가 바뀌었거나 없는 문장을 이은 것은 여전히 통과하지 못한다.
    expect(quoteAppearsIn(answer, "상권이 반드시 살아날 것입니다. ... 대부분의 지방 상권은 유동인구가 줄고")).toBe(false);
    expect(quoteAppearsIn(answer, "대부분의 지방 상권은 유동인구가 줄고 ... 공사가 모든 소상공인을 지원합니다.")).toBe(false);
  });

  it("accepts a quote joined with an ellipsis when the pieces appear in order", () => {
    expect(quoteAppearsIn(text, "지역 경제의 기반은 … 현장에 있다는 것을 체감했습니다")).toBe(true);
    expect(quoteAppearsIn(text, "지역 경제의 기반은 ... 관심을 갖게 되었습니다")).toBe(true);
    expect(quoteAppearsIn(text, "관심을 갖게 되었습니다 … 지역 경제의 기반은")).toBe(false);
  });

  it("still rejects a quote with different words, a made-up sentence or nothing", () => {
    expect(quoteAppearsIn(text, "지역 경제의 기반은 보고서에 있다고 느꼈습니다")).toBe(false);
    expect(quoteAppearsIn(text, "원문에 없는 모순")).toBe(false);
    expect(quoteAppearsIn(text, "   ")).toBe(false);
    expect(quoteAppearsIn(text, "…")).toBe(false);
  });

  it("adopts an evidenced improvement whose quotes were typed with different spacing and quote marks", () => {
    const review = qualityTestReview();
    review.questions[0].sourceQuote = `“${original.replace(/ /g, "  ")}”`;
    review.questions[0].candidateQuote = `${revised.slice(0, 12)} … ${revised.slice(-14)}`;
    const result = apply(review);
    expect(result.revisionQuality?.decision).toBe("adopt");
    expect(result.output.revision.revisedAnswer).toBe(revised);
  });

  it("keeps rejecting an improvement whose quote is not in the text", () => {
    const review = qualityTestReview(); review.questions[0].candidateQuote = "후보에 없는 문장입니다";
    expect(apply(review).revisionQuality?.decision).toBe("keep_current");
  });
});

describe("scoped cross-question veto", () => {
  const request = { ...qualityTestRequest, writingMode: "BUILD" as const, questions: Array.from({ length: 3 }, (_, i) => ({ id: String(i), title: "경험", prompt: "경험을 설명하세요.", targetLength: 500, answer: original })) };
  const candidate = () => {
    const base = qualityTestCandidate();
    base.output.revisions = Array.from({ length: 3 }, (_, i) => ({ ...base.output.revision, questionOrder: i + 1 }));
    return base;
  };
  const review = () => {
    const base = qualityTestReview();
    base.questions = Array.from({ length: 3 }, (_, i) => ({ ...base.questions[0], order: i + 1 }));
    return base;
  };

  it("reverts only the questions the reviewer named", () => {
    const flagged = review(); flagged.crossQuestionRegression = true; flagged.crossQuestionOrders = [2];
    const result = apply(flagged, request, candidate());
    expect(result.output.revisions?.map(q => q.revisedAnswer)).toEqual([revised, original, revised]);
    expect(result.revisionQuality?.decision).toBe("adopt");
  });

  it("reverts every question when the reviewer did not say which ones (the earlier behavior)", () => {
    const flagged = review(); flagged.crossQuestionRegression = true; flagged.crossQuestionOrders = [];
    const result = apply(flagged, request, candidate());
    expect(result.output.revisions?.map(q => q.revisedAnswer)).toEqual([original, original, original]);
    expect(result.revisionQuality?.decision).toBe("keep_current");
  });

  it("treats numbers that match no question as not saying which ones", () => {
    const flagged = review(); flagged.crossQuestionRegression = true; flagged.crossQuestionOrders = [9];
    expect(apply(flagged, request, candidate()).revisionQuality?.decision).toBe("keep_current");
  });

  it("ignores the named questions when no cross-question problem was reported", () => {
    const clean = review(); clean.crossQuestionOrders = [1];
    expect(apply(clean, request, candidate()).output.revisions?.map(q => q.revisedAnswer)).toEqual([revised, revised, revised]);
  });

  it("still lets a question that failed on its own stay rejected inside a scoped veto", () => {
    const flagged = review(); flagged.crossQuestionRegression = true; flagged.crossQuestionOrders = [2];
    flagged.questions[2].lostFactOrVoice = true;
    expect(apply(flagged, request, candidate()).output.revisions?.map(q => q.revisedAnswer)).toEqual([revised, original, original]);
  });
});
