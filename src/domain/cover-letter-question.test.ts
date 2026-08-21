import { describe, expect, it } from "vitest";
import { coverLetterQuestionSchema, serializeQuestionAnswers } from "./cover-letter-question";

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
