import { describe, expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import type { QuickGatewayResult } from "./openai-responses-gateway";
import { combineReviews, isRepairEnabled, MAX_REPAIR_QUESTIONS, mergeRepair, planRepair, REPAIR_ENV, withRepair } from "./revision-repair";
import type { RevisionReview } from "./revision-quality";

const answers = ["첫째 답변입니다. 한빛지역개발공사 이야기를 씁니다.", "둘째 답변입니다.", "셋째 답변입니다.", "넷째 답변입니다.", "다섯째 답변입니다."];
const request = (count = 3): AnalysisRequest => ({
  requestId: "repair-case", product: "QUICK", writingMode: "POLISH", writingStyle: "BALANCED", targetLength: 500,
  documents: [{ kind: "cover_letter", text: "unused" }],
  questions: answers.slice(0, count).map((answer, index) => ({ id: String(index + 1), title: `문항 ${index + 1}`, prompt: "", targetLength: 500, answer })),
});
const candidate = (revised: string[]): QuickGatewayResult => ({
  output: {
    schemaVersion: "1.0", readiness: { score: 70, label: "검토", summary: "요약", reasons: ["이유"] }, priorities: [], verificationQuestions: [], consultingAdvice: [],
    revision: { originalAnnotations: [], subheading: null, lengthNote: null, revisedAnswer: revised[0], highlightedPhrases: [], reasons: [], verificationNote: null },
    revisions: revised.map((revisedAnswer, index) => ({ questionOrder: index + 1, originalAnnotations: [], subheading: null, lengthNote: null, revisedAnswer, highlightedPhrases: [], reasons: [], verificationNote: null })),
  },
  execution: { responseId: "writer", model: "test", promptVersion: "quick-4.5", rubricVersion: "r", schemaVersion: "1.0", inputTokens: 10, outputTokens: 20, totalTokens: 30 },
});
const scores = { questionFit: 3, evidence: 3, logic: 3, readability: 3, specificity: 3 };
const verdict = (order: number, patch: Partial<RevisionReview["questions"][number]> = {}): RevisionReview["questions"][number] => ({
  order, before: scores, after: scores, meaningfulImprovement: false, newError: false, lostFactOrVoice: false, reintroducedIssue: false, preferenceOnly: false,
  reason: `${order}번 검토 이유`, sourceQuote: "q", candidateQuote: "q", previousErrorQuote: null, validAnnotationIndexes: [], validLengthNote: false, ...patch,
});
const review = (verdicts: RevisionReview["questions"]): RevisionReview => ({
  diagnosis: { readiness: { score: 70, label: "검토", summary: "요약", reasons: ["이유"] }, priorities: [], verificationQuestions: [] },
  questions: verdicts, crossQuestionRegression: false, crossQuestionOrders: [], validAdviceIndexes: [], adviceCorrections: [],
});
const rewritten = ["첫째를 고쳤습니다.", "둘째를 고쳤습니다.", "셋째를 고쳤습니다."];

describe("isRepairEnabled", () => {
  it("is off unless the variable is exactly on", () => {
    expect(isRepairEnabled({})).toBe(false);
    expect(isRepairEnabled({ [REPAIR_ENV]: "" })).toBe(false);
    expect(isRepairEnabled({ [REPAIR_ENV]: "1" })).toBe(false);
    expect(isRepairEnabled({ [REPAIR_ENV]: "true" })).toBe(false);
    expect(isRepairEnabled({ [REPAIR_ENV]: "off" })).toBe(false);
    expect(isRepairEnabled({ [REPAIR_ENV]: "on" })).toBe(true);
    expect(isRepairEnabled({ [REPAIR_ENV]: " ON " })).toBe(true);
  });
});

describe("planRepair", () => {
  it("picks a changed question the reviewer rejected for lost fact or voice, with the reviewer's reason", () => {
    const plan = planRepair(request(), candidate(rewritten), review([verdict(1, { lostFactOrVoice: true, reason: "기관 이름을 지웠습니다." }), verdict(2, { meaningfulImprovement: true }), verdict(3)]));
    expect(plan).toEqual({ orders: [1], notes: [{ order: 1, reason: "기관 이름을 지웠습니다.", previousAnswer: "첫째를 고쳤습니다." }] });
  });

  it("also picks a rejection for adding unsupported content", () => {
    expect(planRepair(request(), candidate(rewritten), review([verdict(1), verdict(2, { newError: true }), verdict(3)]))?.orders).toEqual([2]);
  });

  it("leaves out taste-only, reintroduced and plain no-gain rejections", () => {
    const plan = planRepair(request(), candidate(rewritten), review([
      verdict(1, { lostFactOrVoice: true, preferenceOnly: true }),
      verdict(2, { newError: true, reintroducedIssue: true }),
      verdict(3),
    ]));
    expect(plan).toBeNull();
  });

  it("skips a question the writer left unchanged", () => {
    const same = [answers[0], rewritten[1], rewritten[2]];
    expect(planRepair(request(), candidate(same), review([verdict(1, { lostFactOrVoice: true }), verdict(2), verdict(3)]))).toBeNull();
  });

  it("does nothing for a cross-question regression or a re-analysis with history", () => {
    const flagged = review([verdict(1, { lostFactOrVoice: true }), verdict(2), verdict(3)]);
    expect(planRepair(request(), candidate(rewritten), { ...flagged, crossQuestionRegression: true })).toBeNull();
    const previous = { ...request(), previousRevision: { runId: "earlier", relationship: "same_input" as const, result: {} as never } };
    expect(planRepair(previous, candidate(rewritten), flagged)).toBeNull();
  });

  it("repairs at most three questions, lowest numbers first", () => {
    const five = ["a1", "a2", "a3", "a4", "a5"].map((text) => `${text} 고침`);
    const plan = planRepair(request(5), candidate(five), review([1, 2, 3, 4, 5].map((order) => verdict(order, { lostFactOrVoice: true }))));
    expect(plan?.orders).toEqual([1, 2, 3]);
    expect(MAX_REPAIR_QUESTIONS).toBe(3);
  });

  it("ignores a rejection with no reason to hand back", () => {
    expect(planRepair(request(), candidate(rewritten), review([verdict(1, { lostFactOrVoice: true, reason: "  " }), verdict(2), verdict(3)]))).toBeNull();
  });
});

describe("withRepair, mergeRepair and combineReviews", () => {
  const plan = { orders: [2], notes: [{ order: 2, reason: "지우지 마세요", previousAnswer: "둘째를 고쳤습니다." }] };

  it("attaches the notes for the rewrite call only", () => {
    expect(withRepair(request(), plan).repair).toEqual({ notes: plan.notes });
    expect(request().repair).toBeUndefined();
  });

  it("replaces only the planned questions", () => {
    const first = candidate(rewritten);
    const again = candidate(["무시될 첫째", "둘째를 되살려 다시 썼습니다.", "무시될 셋째"]);
    const merged = mergeRepair(first, again, plan);
    expect(merged?.output.revisions?.map((revision) => revision.revisedAnswer)).toEqual(["첫째를 고쳤습니다.", "둘째를 되살려 다시 썼습니다.", "셋째를 고쳤습니다."]);
    expect(merged?.output.revision.revisedAnswer).toBe("첫째를 고쳤습니다.");
    expect(first.output.revisions?.[1].revisedAnswer).toBe("둘째를 고쳤습니다.");
  });

  it("gives up when the rewrite repeated the rejected text, dropped the question, or came back empty", () => {
    expect(mergeRepair(candidate(rewritten), candidate(rewritten), plan)).toBeNull();
    const missing = candidate(rewritten);
    missing.output.revisions = missing.output.revisions?.filter((revision) => revision.questionOrder !== 2);
    expect(mergeRepair(candidate(rewritten), missing, plan)).toBeNull();
    expect(mergeRepair(candidate(rewritten), candidate(["a", "  ", "c"]), plan)).toBeNull();
  });

  it("takes the second verdict for rewritten questions and the first for the rest", () => {
    const first = review([verdict(1, { meaningfulImprovement: true, reason: "첫 검토 1" }), verdict(2, { lostFactOrVoice: true, reason: "첫 검토 2" }), verdict(3, { reason: "첫 검토 3" })]);
    const second = { ...review([verdict(1, { newError: true, reason: "둘째 검토 1" }), verdict(2, { meaningfulImprovement: true, reason: "둘째 검토 2" }), verdict(3, { reason: "둘째 검토 3" })]), crossQuestionRegression: true, crossQuestionOrders: [3] };
    const combined = combineReviews(first, second, plan);
    expect(combined?.questions.map((item) => item.reason)).toEqual(["첫 검토 1", "둘째 검토 2", "첫 검토 3"]);
    expect(combined?.crossQuestionRegression).toBe(true);
    expect(combined?.crossQuestionOrders).toEqual([3]);
    expect(combined?.diagnosis).toBe(first.diagnosis);
  });

  it("refuses to combine when the second review did not judge a rewritten question", () => {
    expect(combineReviews(review([verdict(1), verdict(2), verdict(3)]), review([verdict(1), verdict(3)]), plan)).toBeNull();
  });
});
