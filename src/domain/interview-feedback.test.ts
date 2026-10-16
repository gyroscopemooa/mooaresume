import { describe, expect, it } from "vitest";
import { interviewFeedbackOutputSchema, interviewFeedbackRequestSchema, observeTranscriptDelivery, validateInterviewFeedbackEvidence, type InterviewFeedbackOutput } from "./interview-feedback";

const answer = "현장에서 인수인계 표를 만들었습니다. 교대 시 확인 항목을 공유했습니다.";
function feedback(): InterviewFeedbackOutput {
  const part = { status: "missing" as const, evidence: null, comment: "실제 상황을 확인해 주세요." };
  return { summary: "행동은 제시했지만 결과가 필요합니다.", strengths: [{ title: "행동", evidence: "인수인계 표를 만들었습니다.", reason: "직접 한 행동입니다." }], priorities: [{ title: "결과 확인", evidence: "확인 항목을 공유했습니다.", reason: "공유 이후의 결과가 없습니다.", improvedAnswer: "교대 시 확인 항목을 공유했습니다. [실제 결과 확인 필요]", practice: "결과를 한 문장으로 설명해 보세요." }], star: { situation: part, task: part, action: { status: "present", evidence: "인수인계 표를 만들었습니다.", comment: "행동이 있습니다." }, result: part }, betterAnswer: answer, verificationQuestions: ["실제 결과는 무엇인가요?"], likelyFollowups: ["표에 어떤 항목을 넣었나요?"], unassessed: [] };
}

describe("interview feedback contract", () => {
  it("requires explicit consent and verified transcript", () => {
    const input = { requestId: "13508590-9d47-47dd-af5b-369f9d040aee", consent: true, transcriptConfirmed: true, company: "기업", role: "직무", question: "경험을 설명해 주세요.", answerText: answer, durationSeconds: null, transcriptSource: "manual" };
    expect(interviewFeedbackRequestSchema.safeParse(input).success).toBe(true);
    expect(interviewFeedbackRequestSchema.safeParse({ ...input, consent: false }).success).toBe(false);
    expect(interviewFeedbackRequestSchema.safeParse({ ...input, transcriptConfirmed: false }).success).toBe(false);
    expect(interviewFeedbackRequestSchema.safeParse({ ...input, answerText: "a".repeat(12_001) }).success).toBe(false);
  });
  it("accepts grounded feedback without forced scores or three problems", () => {
    expect(interviewFeedbackOutputSchema.safeParse(feedback()).success).toBe(true);
    expect(validateInterviewFeedbackEvidence(answer, feedback())).toEqual([]);
    expect(interviewFeedbackOutputSchema.safeParse({ ...feedback(), hiringScore: 85 }).success).toBe(false);
  });
  it("rejects fabricated literal evidence and missing STAR grounds", () => {
    const result = feedback(); result.strengths[0].evidence = "매출을 늘렸습니다.";
    result.star.action.evidence = null;
    expect(validateInterviewFeedbackEvidence(answer, result)).toHaveLength(2);
  });
  it("rejects new numbers in improved answers", () => {
    const result = feedback(); result.betterAnswer = "오류를 30% 줄였습니다.";
    expect(validateInterviewFeedbackEvidence(answer, result)).toContain("수정 답변에 원문에 없는 숫자가 있습니다.");
  });
  it("separates text observations from audio scoring", () => {
    expect(observeTranscriptDelivery("음 저는 표를 작성했습니다", 30)).toMatchObject({ whitespaceUnits: 4, unitsPerMinute: 8, visibleFillerCount: 1 });
    expect(observeTranscriptDelivery("음성에는 문제가 없습니다", null)).toMatchObject({ unitsPerMinute: null, visibleFillerCount: 0 });
  });
});
