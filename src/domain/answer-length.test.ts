import { describe, expect, it } from "vitest";
import { describeAnswerLength, readAnswerLimit } from "./answer-length";
import { splitCoverLetterDraft } from "./cover-letter-parser";
import { serializeQuestionAnswers } from "./cover-letter-question";
import { getAnalysisQuestions } from "@/server/ai/quick/questions";

describe("employer limits are not desired length", () => {
  it("reads both ends of a hospital-style constraint", () => {
    expect(readAnswerLimit("(최소 100자, 최대 500자 입력가능)")).toEqual({ min: 100, max: 500, basis: "unknown" });
    expect(readAnswerLimit("공백 포함 1,000자 이내").max).toBe(1000);
    // 일산병원 결과처럼 저장된 문구가 숫자에서 잘린 경우
    expect(readAnswerLimit("작성하여 주시기 바랍니다. (최소 100자, 최대 500")).toMatchObject({ min: 100, max: 500 });
    expect(readAnswerLimit("최대 500명과 협업한 경험")).toMatchObject({ max: null });
  });
  it("does not label a short but valid answer defective", () => {
    expect(describeAnswerLength("가".repeat(365), "최소 100자, 최대 500자 공백 제외", 700)).toContain("기재된 분량 조건 충족");
    expect(describeAnswerLength("가".repeat(365), "", 700)).toContain("필수 최소 분량 아님");
  });
  it("uses explicit whitespace basis and leaves unknown basis open", () => {
    expect(describeAnswerLength("가 나", "최대 2자 공백 포함", 700)).toContain("1자 초과");
    expect(describeAnswerLength("가 나", "최대 2자 공백 제외", 700)).toContain("조건 충족");
    expect(describeAnswerLength("가 나", "최대 2자", 700)).toContain("입력창에서 확인");
    expect(describeAnswerLength("가", "최소 3자 공백 제외", 700)).toContain("2자 미달");
  });
  it("keeps six synthetic answers separate, joins a wrapped prompt and honors 500 over 700", () => {
    const raw = Array.from({ length: 6 }, (_, i) => `${i + 1}. 협업 경험을 설명해 주세요(역할 분담문\n제 해결 과정). (최소 100자, 최대 500자 입력가능)\n가상 답변 ${i + 1}입니다.`).join("\n\n");
    const parsed = splitCoverLetterDraft(raw);
    expect(parsed).toHaveLength(6);
    expect(parsed[0].prompt).toContain("역할 분담문제");
    expect(parsed.map(q => q.answer)).toEqual(Array.from({ length: 6 }, (_, i) => `가상 답변 ${i + 1}입니다.`));
    const questions = getAnalysisQuestions({ requestId: "synthetic", product: "QUICK", writingMode: "BUILD", writingStyle: "BALANCED", targetLength: 700, documents: [{ kind: "cover_letter", text: serializeQuestionAnswers(parsed, { includeTargetLength: true }) }] });
    expect(questions.map(q => q.targetLength)).toEqual([500, 500, 500, 500, 500, 500]);
    expect(questions[0].prompt).toContain("최소 100자");
  });
  it("does not swallow a normal answer into a short heading", () => {
    expect(splitCoverLetterDraft("1. 협업 경험\n저는 담당 업무를 설명했습니다.")[0].answer).toBe("저는 담당 업무를 설명했습니다.");
  });
});
