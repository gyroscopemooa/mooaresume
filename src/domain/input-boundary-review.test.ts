import { describe, expect, it } from "vitest";
import { applyQuestionBoundaryReview, inspectQuestionBoundaries, splitCoverLetterDraft } from "./cover-letter-parser";
import { mapSimpleIntake } from "./simple-intake-mapping";

const draft = "1. 경험을 설명하세요(프로젝트\n저는 역할을 나누어 프로젝트를 완료했습니다.";
describe("input boundary review", () => {
  it("keeps ambiguous answer text instead of swallowing it", () => {
    expect(splitCoverLetterDraft(draft)[0].answer).toBe("저는 역할을 나누어 프로젝트를 완료했습니다.");
    expect(inspectQuestionBoundaries(draft)).toHaveLength(1);
  });
  it("does not warn on ordinary input", () => {
    expect(inspectQuestionBoundaries("1. 경험을 설명하세요(프로젝트)\n내 답변")).toEqual([]);
  });
  it("corrects only the selected section and feeds the actual parser", () => {
    const text = `이력서\n학력 자료\n자기소개서\n${draft}\n2. 지원동기\n두 번째 답변\n경력기술서\n회사 자료`;
    const corrected = applyQuestionBoundaryReview(text, inspectQuestionBoundaries(text)[0], "경험을 설명하세요(프로젝트)", "확인한 답변");
    expect(corrected).toContain("이력서\n학력 자료");
    expect(corrected).toContain("2. 지원동기\n두 번째 답변\n경력기술서\n회사 자료");
    expect(splitCoverLetterDraft(corrected)[0]).toMatchObject({ prompt: "경험을 설명하세요(프로젝트)", answer: "확인한 답변" });
    expect(inspectQuestionBoundaries(corrected)).toEqual([]);
  });
  it("rejects empty fields and stale edits", () => {
    const issue = inspectQuestionBoundaries(draft)[0];
    expect(() => applyQuestionBoundaryReview(draft, issue, "", "답변")).toThrow("BOUNDARY_FIELDS_INVALID");
    expect(() => applyQuestionBoundaryReview(`${draft}변경`, issue, "질문", "답변")).toThrow("BOUNDARY_INPUT_CHANGED");
  });
  it.each(["paste", "pdf"])("passes corrected %s text through PRO/FINAL mapping", source => {
    const text = applyQuestionBoundaryReview(draft, inspectQuestionBoundaries(draft)[0], "경험을 설명하세요(프로젝트)", "검증된 답변");
    const mapped = source === "paste" ? mapSimpleIntake(text, [], 700) : mapSimpleIntake("", [{ filename: "지원서.pdf", extension: "pdf", sizeBytes: 123, kind: "COVER_LETTER", text }], 700);
    expect(mapped.questions[0]).toMatchObject({ prompt: "경험을 설명하세요(프로젝트)", answer: "검증된 답변", targetLength: 700 });
    if (source === "pdf") expect(mapped.sourceFile?.filename).toBe("지원서.pdf");
  });
});
