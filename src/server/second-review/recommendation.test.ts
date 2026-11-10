import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ReviewContext } from "./automatic-contract";
import { advanceAutomaticReview, type AutomaticJob, type AutomaticRepository } from "./automatic-worker";
import type { AutomaticGateway } from "./automatic-gateway";
import { RECOMMENDATION_REVIEW_VERSION, recommendationDraftSchema, recommendationVerificationSchema, toRecommendationPreview, type RecommendationDraft, type RecommendationVerification } from "./recommendation-contract";
import { buildExtraReviewResult } from "@/domain/second-review-result";
import { sampleResultDocument } from "@/fixtures/result-document";

const id = "11111111-1111-4111-8111-111111111111";
const body = " 로그를 확인했습니다.\n원인을 찾았습니다.\n";
const context: ReviewContext = {
  units: [{ order: 1, sourceQuestionOrder: 1, title: "업무 경험", sourceText: body, firstAnswer: body }],
  source: {}, documents: [], writingMode: "POLISH", writingStyle: "BALANCED", targetLength: null,
};
const good = { anchorQuote: "로그를 확인했습니다.", kind: "improve" as const, sentence: "원인을 파악하기 위해 로그를 확인했습니다.", why: "확인 행동과 목적을 연결하는 표현입니다.", needsConfirmation: null };
const draft: RecommendationDraft = { answers: [{ order: 1, recommendations: [good], subheading: null }] };
const accepted = { factsPreserved: true, noInventedFacts: true, consistentWithFirst: true, appropriateStyle: true, useful: true, reason: "제공된 확인 행동과 목적을 연결합니다." };
const verification: RecommendationVerification = { answers: [{ order: 1, recommendations: [{ index: 0, ...accepted }], subheading: { ...accepted, useful: false } }] };
function job(status: AutomaticJob["status"]): AutomaticJob {
  return { analysis_run_id: id, lease_token: "22222222-2222-4222-8222-222222222222", status,
    context, draft, execution: { version: RECOMMENDATION_REVIEW_VERSION },
    draft_response_id: "resp_draft", verify_response_id: "resp_verify", created_at: new Date().toISOString() };
}
function mocks() {
  const repository: AutomaticRepository = { loadContext: vi.fn().mockResolvedValue(context), save: vi.fn(), finish: vi.fn() };
  const gateway: AutomaticGateway = { start: vi.fn().mockResolvedValue("resp_new"), poll: vi.fn().mockResolvedValue({ status: "completed", output: verification, execution: { usage: { total_tokens: 100 } } }) };
  return { repository, gateway };
}

describe("recommendation-only additional review", () => {
  it("never requests generated body or self-rated improvement and permits no suggestions", () => {
    const schema = JSON.stringify(z.toJSONSchema(recommendationDraftSchema));
    expect(schema).not.toMatch(/revisedAnswer|disposition|summary/);
    expect(recommendationDraftSchema.parse({ answers: [{ order: 1, recommendations: [], subheading: null }] }).answers[0].recommendations).toEqual([]);
    expect(JSON.stringify(z.toJSONSchema(recommendationVerificationSchema))).not.toContain('"approved"');
  });
  it("preserves first-pass body byte-for-byte and leaves first-pass judgments intact", () => {
    const preview = toRecommendationPreview(id, context, draft, verification)!;
    expect(preview.revisedAnswers[0].revisedAnswer).toBe(body);
    expect(preview.revisedAnswers[0].section?.disposition).toBe("maintained");
    const firstRecommendation = { id: "first-choice", kind: "improve" as const, anchorQuote: "원인을 찾았습니다.", sentence: "확인한 로그에서 원인을 찾았습니다.", why: "확인 대상과 결과를 연결합니다." };
    const source = { ...sampleResultDocument, questions: [{ ...sampleResultDocument.questions[0], order: 1, revisedAnswer: body, recommendations: [firstRecommendation] }] };
    const result = buildExtraReviewResult(source, { ...preview, id, createdAt: "2026-11-10", updatedAt: "2026-11-10" });
    expect(result.questions[0].revisedAnswer).toBe(body);
    expect(result.questions[0].originalAnnotations).toEqual(source.questions[0].originalAnnotations);
    expect(result.questions[0].revisionReasons).toEqual(source.questions[0].revisionReasons);
    expect(result.priorities).toEqual(source.priorities);
    expect(result.questions[0].recommendations).toHaveLength(2);
    expect(result.questions[0].recommendations?.[0]).toEqual(firstRecommendation);
  });
  it("drops only the rejected recommendation, even within the same item", () => {
    const candidate = { answers: [{ ...draft.answers[0], recommendations: [good, { ...good, sentence: "매출을 100% 높였습니다." }] }] };
    const checked = { answers: [{ ...verification.answers[0], recommendations: [{ index: 0, ...accepted }, { index: 1, ...accepted, noInventedFacts: false, reason: "원문에 없는 성과" }] }] };
    expect(toRecommendationPreview(id, context, candidate, checked)?.revisedAnswers[0].section?.recommendations?.map(r => r.sentence)).toEqual([good.sentence]);
  });
  it.each(["factsPreserved", "noInventedFacts", "consistentWithFirst", "appropriateStyle", "useful"] as const)("excludes a suggestion when %s fails", field => {
    const checked = { answers: [{ ...verification.answers[0], recommendations: [{ index: 0, ...accepted, [field]: false }] }] };
    expect(toRecommendationPreview(id, context, draft, checked)).toBeNull();
  });
  it("does not accept fabricated anchors, unchanged wording or new unconfirmed numbers despite model approval", () => {
    for (const change of [{ anchorQuote: "存在しない文" }, { sentence: good.anchorQuote }, { sentence: "로그를 확인해 100% 해결했습니다." }, { sentence: "로그를 먼저 확인했다." }]) {
      expect(toRecommendationPreview(id, context, { answers: [{ ...draft.answers[0], recommendations: [{ ...good, ...change }] }] }, verification)).toBeNull();
    }
  });
  it("requires both an inline confirmation mark and a clarification for conditional added facts", () => {
    const conditional = { ...good, kind: "add" as const, sentence: "[확인 필요: 재현 여부] 동일 조건에서 문제를 재현했습니다.", needsConfirmation: "문제를 직접 재현했는지 확인해 주세요." };
    const make = (recommendation: typeof conditional) => ({ answers: [{ ...draft.answers[0], recommendations: [recommendation] }] });
    expect(toRecommendationPreview(id, context, make(conditional), verification)).not.toBeNull();
    expect(toRecommendationPreview(id, context, make({ ...conditional, sentence: "문제를 직접 재현했습니다." }), verification)).toBeNull();
    expect(toRecommendationPreview(id, context, { answers: [{ ...draft.answers[0], recommendations: [{ ...conditional, needsConfirmation: null }] }] }, verification)).toBeNull();
  });
  it("does not apply unsupported deletion claims to the retained body", () => {
    const checked = { answers: [{ ...verification.answers[0], recommendations: [{ index: 0, ...accepted, useful: false, reason: "본문에서 없는 문구를 삭제했습니다." }] }] };
    expect(toRecommendationPreview(id, context, draft, checked)).toBeNull();
    expect(context.units[0].firstAnswer).toBe(body);
  });
  it("fails closed on missing, duplicate or out-of-range verification indexes", () => {
    for (const recommendations of [[], [{ index: 1, ...accepted }], [{ index: 0, ...accepted }, { index: 0, ...accepted }]]) {
      expect(() => toRecommendationPreview(id, context, draft, { answers: [{ ...verification.answers[0], recommendations }] })).toThrow("VERIFICATION_COVERAGE");
    }
    expect(() => toRecommendationPreview(id, context, draft, { answers: [] })).toThrow("VERIFICATION_COVERAGE");
  });
  it("preserves a plain-style first pass instead of pretending to rewrite it", () => {
    const plain = { ...context, units: [{ ...context.units[0], firstAnswer: `${body}\n남은 일이 있다.` }] };
    expect(toRecommendationPreview(id, plain, draft, verification)?.revisedAnswers[0].revisedAnswer).toBe(plain.units[0].firstAnswer);
  });
  it("keeps a useful heading independently and never replaces a first-pass heading", () => {
    const candidate = { answers: [{ ...draft.answers[0], recommendations: [], subheading: "로그에서 찾은 원인" }] };
    const checked = { answers: [{ order: 1, recommendations: [], subheading: accepted }] };
    expect(toRecommendationPreview(id, context, candidate, checked)?.revisedAnswers[0].section?.subheading).toBe("로그에서 찾은 원인");
    expect(toRecommendationPreview(id, { ...context, source: { questions: [{ order: 1, subheading: "기존 소제목" }] } }, candidate, checked)).toBeNull();
  });
  it("starts new jobs with v2 recorded before purchase", async () => {
    const { repository, gateway } = mocks();
    expect(await advanceAutomaticReview(job("pending"), repository, gateway)).toBe("draft_running");
    expect(repository.save).toHaveBeenNthCalledWith(1, expect.anything(), expect.objectContaining({ status: "draft_starting", execution: expect.objectContaining({ version: RECOMMENDATION_REVIEW_VERSION }) }), false);
    expect(repository.loadContext).toHaveBeenCalledWith(id, true);
    expect(gateway.start).toHaveBeenCalledWith("draft", expect.anything(), RECOMMENDATION_REVIEW_VERSION);
  });
  it("skips paid verification for a draft without suggestions", async () => {
    const { repository, gateway } = mocks();
    const empty = { answers: [{ order: 1, recommendations: [], subheading: null }] };
    vi.mocked(gateway.poll).mockResolvedValue({ status: "completed", output: empty, execution: {} });
    expect(await advanceAutomaticReview(job("draft_running"), repository, gateway)).toBe("needs_attention");
    expect(repository.save).toHaveBeenLastCalledWith(expect.anything(), { status: "needs_attention", failure_code: "SECOND_REVIEW_NO_ADDITIONAL_SUGGESTIONS" });
    expect(gateway.start).not.toHaveBeenCalled();
    expect(repository.finish).not.toHaveBeenCalled();
  });
  it("uses separate versioned verification and publishes only filtered recommendations", async () => {
    const { repository, gateway } = mocks();
    expect(await advanceAutomaticReview(job("verify_pending"), repository, gateway)).toBe("verify_running");
    expect(gateway.start).toHaveBeenCalledWith("verify", expect.objectContaining({ candidate: draft }), RECOMMENDATION_REVIEW_VERSION);
    expect(await advanceAutomaticReview(job("verify_running"), repository, gateway)).toBe("completed");
    expect(repository.finish).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ revisedAnswers: [expect.objectContaining({ revisedAnswer: body })] }), expect.objectContaining({ approved: true, policyVersion: RECOMMENDATION_REVIEW_VERSION }), expect.anything());
  });
  it("retains rejected evidence with no preview when every recommendation fails", async () => {
    const { repository, gateway } = mocks();
    const rejected = { answers: [{ ...verification.answers[0], recommendations: [{ index: 0, ...accepted, noInventedFacts: false }] }] };
    vi.mocked(gateway.poll).mockResolvedValue({ status: "completed", output: rejected, execution: {} });
    expect(await advanceAutomaticReview(job("verify_running"), repository, gateway)).toBe("needs_attention");
    expect(repository.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ verification: rejected }), false);
    expect(repository.finish).not.toHaveBeenCalled();
  });
});
