import { describe, expect, it } from "vitest";
import { coverLetterQuestionSchema, serializeQuestionAnswers } from "./cover-letter-question";

describe("cover letter questions", () => {
  it("serializes separate questions without losing prompts", () => {
    const text = serializeQuestionAnswers([{ id: "q1", title: "지원동기", prompt: "지원 이유", targetLength: 700, answer: "답변" }]);
    expect(text).toContain("1. 지원동기");
    expect(text).toContain("질문: 지원 이유");
  });

  it("validates a question contract", () => {
    expect(coverLetterQuestionSchema.safeParse({ id: "q1", title: "", prompt: "", targetLength: 700, answer: "초안" }).success).toBe(true);
  });
});

