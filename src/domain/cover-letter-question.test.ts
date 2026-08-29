import { describe, expect, it } from "vitest";
import { applyDefaultTargetLength, coverLetterQuestionSchema, readTargetLengthMarker, serializeQuestionAnswers } from "./cover-letter-question";

describe("cover letter questions", () => {
  it("serializes separate questions without losing prompts", () => {
    const text = serializeQuestionAnswers([{ id: "q1", title: "지원동기", prompt: "지원 이유", targetLength: 700, answer: "답변" }]);
    expect(text).toContain("1. 지원동기");
    expect(text).toContain("질문: 지원 이유");
  });

  it("uses a prompt as the heading instead of inventing a duplicate question label", () => {
    const text = serializeQuestionAnswers([{ id: "q1", title: "", prompt: "지원동기를 작성해 주세요.", targetLength: 700, answer: "답변" }]);
    expect(text).toBe("1. 지원동기를 작성해 주세요.\n답변");
    expect(text).not.toContain("문항 1");
  });

  it("preserves an unanswered prompt only for editable bulk text", () => {
    const questions = [
      { id: "q1", title: "", prompt: "지원동기를 작성해 주세요.", targetLength: 700, answer: "답변" },
      { id: "q4", title: "", prompt: "경력사항을 작성해 주세요.", targetLength: 700, answer: "" },
    ];

    expect(serializeQuestionAnswers(questions)).not.toContain("경력사항을 작성해 주세요.");
    expect(serializeQuestionAnswers(questions, { includeEmptyAnswers: true })).toBe(
      "1. 지원동기를 작성해 주세요.\n답변\n\n2. 경력사항을 작성해 주세요.\n",
    );
  });

  it("returns a lone untitled draft unchanged instead of stacking a heading on it", () => {
    // The bulk textarea holds the applicant's own numbering. Re-heading it is
    // what produced documents with a duplicated "1. ..." line and a phantom
    // extra question on the server.
    const draft = "1. 지원동기를 작성\n실제 답변입니다.";
    const text = serializeQuestionAnswers([{ id: "q1", title: "", prompt: "", targetLength: null, answer: draft }]);
    expect(text).toBe(draft);
    expect(text).not.toContain("문항 1");
  });

  it("validates a question contract", () => {
    expect(coverLetterQuestionSchema.safeParse({ id: "q1", title: "", prompt: "", targetLength: 700, answer: "초안" }).success).toBe(true);
  });
});

describe("공고에 적힌 글자 수 읽기", () => {
  it("괄호와 이내까지 읽는다", () => {
    // Korean postings write it as (500자), 500자 이내 or [500자] about equally.
    // Reading only our own bracket form left a stated limit sitting in plain
    // sight and still treated as unstated.
    for (const heading of ["지원 동기 [500자]", "지원 동기 (500자)", "지원 동기 500자 이내", "성장과정(500자)"]) {
      expect(readTargetLengthMarker(heading).targetLength, heading).toBe(500);
      expect(readTargetLengthMarker(heading).heading, heading).not.toContain("500");
    }
  });

  it("없으면 없다고 한다", () => {
    expect(readTargetLengthMarker("지원 동기").targetLength).toBeNull();
    expect(readTargetLengthMarker("지원 동기").heading).toBe("지원 동기");
  });

  it("한 번 적은 값이 스스로 밝힌 값을 덮지 않는다", () => {
    const filled = applyDefaultTargetLength(
      [{ id: "a", title: "", prompt: "", targetLength: 800, answer: "가" }, { id: "b", title: "", prompt: "", targetLength: null, answer: "나" }],
      600,
    );
    expect(filled.map((question) => question.targetLength)).toEqual([800, 600]);
    expect(applyDefaultTargetLength(filled, null).map((question) => question.targetLength)).toEqual([800, 600]);
  });
});
