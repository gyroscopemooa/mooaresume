import { describe, expect, it, vi } from "vitest";
import { sampleResultDocument } from "@/fixtures/result-document";
import { buildReviewUnits, droppedKeyTerms, promptContext, repeatedEndings, reviewSource, splitWritingSections, validateDraft, validateVerification, toAutomaticPreview, type ReviewContext, type ReviewDraft } from "./automatic-contract";
import { advanceAutomaticReview, type AutomaticJob, type AutomaticRepository } from "./automatic-worker";
import type { AutomaticGateway } from "./automatic-gateway";

const context: ReviewContext = {
  units: [{ order: 1, sourceQuestionOrder: 1, title: "지원 계기", sourceText: "행사를 좋아한다.", firstAnswer: "행사를 좋아한다." }],
  source: {}, documents: [], writingMode: "CREATE", writingStyle: "BALANCED", targetLength: 700,
};
const draft: ReviewDraft = { summary: "문체 보완", answers: [{ order: 1, disposition: "improved", revisedAnswer: "행사를 좋아합니다.", reasons: ["제출 문체로 정리했습니다."], verificationNote: "공식 분량 확인 필요" }] };
const verification = { approved: true, answers: [{ order: 1, factsPreserved: true, noInventedFacts: true, feedbackResolvedOrFlagged: true, appropriateStyle: true, completeCoverage: true, noRegression: true, dispositionAccurate: true, keyContentPreserved: true, noNewRepetition: true, reason: "경험 보존 확인" }], remainingIssues: [] };
const makeJob = (status: AutomaticJob["status"]): AutomaticJob => ({
  analysis_run_id: "11111111-1111-4111-8111-111111111111", lease_token: "22222222-2222-4222-8222-222222222222",
  status, context, draft, execution: {}, draft_response_id: "resp_draft", verify_response_id: "resp_verify", created_at: new Date().toISOString(),
});
function mocks() {
  const repository: AutomaticRepository = { loadContext: vi.fn().mockResolvedValue(context), save: vi.fn().mockResolvedValue(undefined), finish: vi.fn().mockResolvedValue(undefined) };
  const gateway: AutomaticGateway = { start: vi.fn().mockResolvedValue("resp_new"), poll: vi.fn().mockResolvedValue({status:"pending"}) };
  return { repository, gateway };
}
describe("automatic consultant review", () => {
  it("preserves all five source topics even when the first output collapsed them", () => {
    const titles = ["지원 계기","하고 싶은 일","경험 ①","강점과 일하는 방식","입사 후 목표"];
    const source = { ...sampleResultDocument, questions: [{ ...sampleResultDocument.questions[0],
      originalAnswer: titles.map(title => `[${title}]\n${title}의 사실입니다.`).join("\n"),
      revisedAnswer: "요약만 있습니다.",
    }] };
    expect(buildReviewUnits(source).map(u => u.title)).toEqual(titles);
    expect(buildReviewUnits(source).every(u => u.firstAnswer === "요약만 있습니다.")).toBe(true);
    expect(splitWritingSections("도입\n[A]\na\n[B]\nb")[0].title).toBe("도입");
  });
  it("rejects missing/duplicate orders and unchanged text called improved", () => {
    expect(() => validateDraft(context,{...draft,answers:[]})).toThrow("COVERAGE");
    expect(() => validateDraft(context,{...draft,answers:[draft.answers[0],draft.answers[0]]})).toThrow("COVERAGE");
    expect(() => validateDraft(context,{...draft,answers:[{...draft.answers[0],revisedAnswer:"행사를 좋아한다."}]})).toThrow("FALSE_CHANGE");
  });
  it("allows a well-founded maintained answer without inventing changes", () => {
    const kept: ReviewDraft = { ...draft, answers: [{...draft.answers[0],disposition:"maintained",revisedAnswer:context.units[0].firstAnswer,reasons:["원문의 사실과 구조가 적합해 유지했습니다."]}] };
    const requestedPlain = { ...context, documents: [{ kind:"REVISION_REQUEST",text:"한다체로 유지해 주세요." }] };
    expect(toAutomaticPreview(makeJob("pending").analysis_run_id,requestedPlain,kept).revisedAnswers[0].section?.disposition).toBe("maintained");
    expect(() => validateDraft(context,kept)).toThrow("PLAIN_STYLE");
  });
  it("fails closed on a single failed check, missing verification or remaining issue", () => {
    expect(() => validateVerification(context,{...verification,answers:[]})).toThrow();
    expect(() => validateVerification(context,{...verification,remainingIssues:["누락"]})).toThrow();
    expect(() => validateVerification(context,{...verification,answers:[{...verification.answers[0],noInventedFacts:false}]})).toThrow();
  });
  it.each(["dispositionAccurate","keyContentPreserved","noNewRepetition"] as const)("rejects when %s fails", check => {
    expect(() => validateVerification(context,{...verification,answers:[{...verification.answers[0],[check]:false}]})).toThrow("REJECTED");
  });
  it("keeps the 1st pass's internal candidate review out of what the 2nd pass reads", () => {
    const withMemo = { ...context, source: { questions: [], revisionQuality: { reason: "2번: 후보는 '장시간'을 삭제했습니다." } } };
    expect(JSON.stringify(promptContext(withMemo))).not.toContain("장시간");
    expect(reviewSource({ priorities: [] })).toEqual({ priorities: [] });
    expect(reviewSource(null)).toBeNull();
  });
  // 2026-10-22 production 2nd draft (QUICK POLISH) that passed the model verifier.
  const motive = "전공을 학습했습니다. 공정 개선에 관심을 갖게 되었습니다. 신규 Concept 구조 개발에 참여하겠습니다.";
  const motiveUnit: ReviewContext = { ...context, units: [{ ...context.units[0], sourceText: motive, firstAnswer: motive }] };
  it("rejects a draft that ends back-to-back sentences the same way", () => {
    const repeated = "전공을 학습했습니다. 공정 개선에 관심을 갖게 되었습니다. 구조 개발 업무에 관심을 갖게 되었습니다. 신규 Concept 구조 개발에 참여하겠습니다.";
    expect(repeatedEndings(repeated)).toBe(1);
    expect(repeatedEndings("A를 했습니다. B를 했습니다.")).toBe(0);
    expect(() => validateDraft(motiveUnit,{...draft,answers:[{...draft.answers[0],revisedAnswer:repeated}]})).toThrow("REPEATED_ENDING");
  });
  it("rejects a draft that drops the applicant's numbers or English terms", () => {
    expect(droppedKeyTerms(motive, motive, motive.replace("Concept ", ""))).toEqual(["Concept"]);
    expect(droppedKeyTerms("전체의 2/3가 백지였고 1.5배를 달성했습니다.", "전체의 2/3가 백지였고 1.5배를 달성했습니다.", "전체의 3분의 2가 백지였고 1.5 배를 달성했습니다.")).toEqual(["2/3"]);
    expect(() => validateDraft(motiveUnit,{...draft,answers:[{...draft.answers[0],revisedAnswer:motive.replace("Concept ", "")}]})).toThrow("KEY_TERM_DROPPED");
  });
  it("lets the 2nd pass remove a term only the 1st pass added", () => {
    expect(droppedKeyTerms("성과를 냈습니다.", "성과 20%를 냈습니다.", "성과를 냈습니다.")).toEqual([]);
  });
  it("persists start intent before buying generation and then saves the response cursor", async () => {
    const {repository,gateway}=mocks();
    expect(await advanceAutomaticReview(makeJob("pending"),repository,gateway)).toBe("draft_running");
    expect(repository.save).toHaveBeenNthCalledWith(1,expect.anything(),expect.objectContaining({status:"draft_starting"}),false);
    expect(gateway.start).toHaveBeenCalledOnce();
    expect(repository.finish).not.toHaveBeenCalled();
  });
  it.each(["draft_starting","verify_starting"] as const)("does not purchase again after ambiguous %s", async status => {
    const {repository,gateway}=mocks();
    expect(await advanceAutomaticReview(makeJob(status),repository,gateway)).toBe("needs_attention");
    expect(gateway.start).not.toHaveBeenCalled();
    expect(repository.finish).not.toHaveBeenCalled();
  });
  it("waits without regenerating while the provider is running", async () => {
    const {repository,gateway}=mocks();
    expect(await advanceAutomaticReview(makeJob("draft_running"),repository,gateway)).toBe("pending");
    expect(gateway.start).not.toHaveBeenCalled();
  });
  it("requires a separate verification call before saving a preview", async () => {
    const {repository,gateway}=mocks();
    vi.mocked(gateway.poll).mockResolvedValue({status:"completed",output:draft,execution:{model:"test"}});
    expect(await advanceAutomaticReview(makeJob("draft_running"),repository,gateway)).toBe("verify_pending");
    expect(repository.finish).not.toHaveBeenCalled();
    expect(await advanceAutomaticReview(makeJob("verify_pending"),repository,gateway)).toBe("verify_running");
    expect(gateway.start).toHaveBeenCalledWith("verify",expect.objectContaining({candidate:draft}));
  });
  it("stores only a verified preview; rejected draft stays private and never completes", async () => {
    const {repository,gateway}=mocks();
    vi.mocked(gateway.poll).mockResolvedValue({status:"completed",output:{...verification,approved:false},execution:{}});
    expect(await advanceAutomaticReview(makeJob("verify_running"),repository,gateway)).toBe("needs_attention");
    expect(repository.finish).not.toHaveBeenCalled();
    vi.mocked(gateway.poll).mockResolvedValue({status:"completed",output:verification,execution:{}});
    expect(await advanceAutomaticReview(makeJob("verify_running"),repository,gateway)).toBe("completed");
    expect(repository.finish).toHaveBeenCalledOnce();
  });
  it("halts provider errors without auto retries", async () => {
    const {repository,gateway}=mocks();
    vi.mocked(gateway.start).mockRejectedValue(new Error("timeout"));
    expect(await advanceAutomaticReview(makeJob("pending"),repository,gateway)).toBe("needs_attention");
    expect(gateway.start).toHaveBeenCalledOnce();
  });
});
