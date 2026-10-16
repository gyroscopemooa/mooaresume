import { describe, expect, it } from "vitest";
import { splitCoverLetterDraft } from "./cover-letter-parser";
import { sampleResultDocument } from "@/fixtures/result-document";
import { restoreWrappedQuestion, restoreLocalResultQuestionBoundaries } from "./wrapped-question-boundary";

const heading = "학교나 직장에서 문제상황이 발생(대인관계, 업무분담문";
const tail = "제, 업무처리문제 등)하여 이를 해결한 경험을 작성하여 주시기 바랍니다. 또는 본인의 방법을 작성하여 주시기 바랍니다. (최소 100자, 최대 500자 입력가능)";
const body = "[의견을 확인한 경험]\n저는 의견을 정리하고 함께 확인했습니다.";

describe("wrapped question boundary", () => {
  it("keeps a wrapped question out of the applicant answer", () => {
    const result = splitCoverLetterDraft(`4. ${heading}\n${tail}\n\n${body}\n5. 성장 경험을 작성해 주세요.\n다음 답변`);
    expect(result).toHaveLength(2);
    expect(result[0].prompt).toContain("업무분담문제,");
    expect(result[0].prompt).toContain("최대 500자");
    expect(result[0].answer).toBe(body);
    expect(result[1].answer).toBe("다음 답변");
  });
  it.each(["자기소개", "경험을 작성해 주세요. (최대 500자)"])("does not move answer text for complete headings: %s", (title) => {
    expect(restoreWrappedQuestion(title, `${tail}\n${body}`).prefix).toBe("");
  });
  it("does not guess without the limit footer or across a subheading", () => {
    expect(restoreWrappedQuestion(heading, "저는 문제를 해결했습니다.").prefix).toBe("");
    expect(restoreWrappedQuestion(heading, `[답변]\n${tail}`).prefix).toBe("");
  });
  it("repairs old views only with matching evidence in original and revised answers", () => {
    const question = { ...sampleResultDocument.questions[0], title: heading, prompt: heading, originalAnswer: `${tail}\n${body}`, revisedAnswer: `${tail}\n${body}` };
    const source = { ...sampleResultDocument, questions: [question] };
    const repaired = restoreLocalResultQuestionBoundaries(source);
    expect(repaired.questions[0].revisedAnswer).toBe(body);
    expect(repaired.questions[0].title).toContain("업무분담문제,");
    expect(source.questions[0].revisedAnswer).toContain(tail);
    expect(restoreLocalResultQuestionBoundaries(repaired)).toBe(repaired);
    const uncertain = { ...source, questions: [{ ...question, originalAnswer: body }] };
    expect(restoreLocalResultQuestionBoundaries(uncertain)).toBe(uncertain);
  });
});
