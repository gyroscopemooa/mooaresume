import { describe, expect, it } from "vitest";
import { combineAcceptedEdits, validateProposal, type ExperimentInput } from "./admin-editing-experiment";
const input: ExperimentInput = { company: "기관", role: "지원", sourcePromptVersion: "quick-4.5", questions: [
  { order: 1, prompt: "경험", targetLength: 500, original: "문의에 답햇습니다. 팀장에게 보고했습니다.", delivered: "문의에 답햇습니다. 팀장에게 보고했습니다.", rejected: "팀장으로 총괄했습니다.", rejectionReason: "직책 날조", eligible: true },
  { order: 2, prompt: "기여", targetLength: 500, original: "기존", delivered: "제공된 결과", rejected: "후보", rejectionReason: "", eligible: false },
] };
const proposal = { edits: [
  { id: 1, order: 1, source: "문의에 답햇습니다.", replacement: "문의에 답했습니다.", reason: "오탈자" },
  { id: 2, order: 1, source: "팀장에게 보고했습니다.", replacement: "팀장으로 총괄했습니다.", reason: "강조" },
] };
describe("관리자 전용 문장 채택", () => {
  it("좋은 수정만 살리고 다른 문항의 제공 결과를 보존한다", () => {
    expect(combineAcceptedEdits(input, "SENTENCE", proposal, { decisions: [{ id: 1, accept: true, reason: "교정" }, { id: 2, accept: false, reason: "날조" }] }))
      .toEqual([{ order: 1, text: "문의에 답했습니다. 팀장에게 보고했습니다." }, { order: 2, text: "제공된 결과" }]);
  });
  it("누락·중복 검토는 조합하지 않는다", () => {
    expect(() => combineAcceptedEdits(input, "SENTENCE", proposal, { decisions: [] })).toThrow("INCOMPLETE");
    expect(() => combineAcceptedEdits(input, "SENTENCE", proposal, { decisions: [{ id: 1, accept: true, reason: "a" }, { id: 1, accept: false, reason: "b" }] })).toThrow("INCOMPLETE");
  });
  it("부분 문자열·없는 문장·미대상 문항은 거절한다", () => {
    for (const patch of [{ source: "문의" }, { source: "없는 문장" }, { order: 2 }]) {
      expect(() => validateProposal(input, "SENTENCE", { edits: [{ ...proposal.edits[0], ...patch }] })).toThrow();
    }
  });
  it("중복/겹침과 문장 여러 개 교체를 차단한다", () => {
    expect(() => validateProposal(input, "SENTENCE", { edits: [proposal.edits[0], { ...proposal.edits[0], id: 3 }] })).toThrow();
    expect(() => validateProposal(input, "SENTENCE", { edits: [{ ...proposal.edits[0], source: input.questions[0].original }] })).toThrow();
  });
  it("재작성 모드만 답변 전체 교체를 허용한다", () => {
    expect(() => validateProposal(input, "REWRITE", proposal)).toThrow();
    expect(() => validateProposal(input, "REWRITE", { edits: [{ ...proposal.edits[0], source: input.questions[0].original }] })).not.toThrow();
  });
});
