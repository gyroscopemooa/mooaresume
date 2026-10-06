import { describe, expect, it } from "vitest";
import { getAnalysisQuestions } from "@/server/ai/quick/questions";
import { buildStabilityRequest, stabilityQuestions } from "./quick-stability-case";

describe("quick stability fixture", () => {
  const questions = getAnalysisQuestions(buildStabilityRequest());

  it("앱이 보내는 형식 그대로 5개 문항과 문항별 글자 수로 나뉜다", () => {
    expect(questions.map((question) => question.targetLength)).toEqual([550, 550, 450, 450, 450]);
    expect(questions.map((question) => question.title)).toEqual(stabilityQuestions.map((question) => question.title));
  });

  it("질문 문장은 답변 맨 앞 '질문:' 줄로 남는다(실제 분석 결과와 같은 모양)", () => {
    for (const [index, question] of questions.entries()) {
      expect(question.answer.split("\n")[0]).toBe(`질문: ${stabilityQuestions[index].prompt}`);
    }
  });

  it("고객 글이 아니라 지어낸 기관·지원자만 쓴다", () => {
    const text = stabilityQuestions.map((question) => question.answer).join("\n");
    expect(text).toContain("한빛지역개발공사");
    expect(text).not.toContain("한국무역보험공사");
  });
});
