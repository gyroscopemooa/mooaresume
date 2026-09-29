import { z } from "zod";
import { questionTypeSchema, trainingContextSchema, QUESTION_CRITERIA } from "./interview-training";

export const INTERVIEW_FEEDBACK_SCHEMA_VERSION = "interview-feedback-2.0";
export const INTERVIEW_FEEDBACK_LIMITS = {
  maxAudioBytes: 12 * 1024 * 1024,
  maxDurationSeconds: 180,
  maxAnswerCharacters: 12_000,
  maxOutputTokens: 6_000,
  callsPerHour: 12,
} as const;

export const interviewFeedbackRequestSchema = z.object({
  requestId: z.uuid(),
  consent: z.literal(true),
  transcriptConfirmed: z.literal(true),
  question: z.string().trim().min(3).max(2_000),
  company: z.string().trim().max(200),
  role: z.string().trim().max(200),
  answerText: z.string().trim().min(10).max(INTERVIEW_FEEDBACK_LIMITS.maxAnswerCharacters),
  durationSeconds: z.number().finite().positive().max(180).nullable(),
  transcriptSource: z.enum(["manual", "transcription"]),
  trainingContext: trainingContextSchema.optional(),
}).strict();

const sentence = z.string().min(1).max(1_200);
const starPart = z.object({
  status: z.enum(["present", "partial", "missing", "not_applicable"]),
  evidence: z.string().min(1).max(1_200).nullable(),
  comment: sentence,
}).strict();

export const interviewFeedbackOutputSchema = z.object({
  summary: sentence,
  strengths: z.array(z.object({ title: z.string().min(1).max(120), evidence: sentence, reason: sentence }).strict()).max(3),
  priorities: z.array(z.object({
    title: z.string().min(1).max(120), evidence: sentence, reason: sentence,
    improvedAnswer: sentence, practice: sentence,
  }).strict()).max(3),
  star: z.object({ situation: starPart, task: starPart, action: starPart, result: starPart }).strict(),
  betterAnswer: z.string().min(1).max(3_000),
  verificationQuestions: z.array(sentence).max(5),
  likelyFollowups: z.array(sentence).max(4),
  unassessed: z.array(sentence).max(8),
}).strict();

export type InterviewFeedbackRequest = z.infer<typeof interviewFeedbackRequestSchema>;
export type InterviewFeedbackOutput = z.infer<typeof interviewFeedbackOutputSchema>;
export const interviewCoachOutputSchema = interviewFeedbackOutputSchema.extend({
  questionType: questionTypeSchema,
  criteria: z.array(z.object({ name: z.string().min(1).max(100), status: z.enum(["present", "partial", "missing", "not_applicable"]), evidence: sentence.nullable(), comment: sentence }).strict()).min(1).max(6),
  keywords: z.array(z.object({ text: z.string().min(1).max(80), evidence: sentence }).strict()).max(6),
  annotations: z.array(z.object({ quote: sentence, kind: z.enum(["strength", "abstract", "missing_evidence", "relevance"]), comment: sentence }).strict()).max(8),
  nextTurn: z.object({ action: z.enum(["follow_up", "next_topic"]), question: sentence.nullable(), evidence: sentence.nullable(), reason: sentence }).strict(),
}).strict();
export type InterviewCoachOutput = z.infer<typeof interviewCoachOutputSchema>;
export function validateCoachEvidence(answer: string, feedback: InterviewCoachOutput): string[] {
  const errors = validateInterviewFeedbackEvidence(answer, feedback);
  for (const item of feedback.criteria) {
    if (!QUESTION_CRITERIA[feedback.questionType].includes(item.name)) errors.push("질문 유형과 다른 평가 기준입니다.");
    if ((item.status === "present" || item.status === "partial") && !item.evidence) errors.push("판단 근거가 없습니다.");
    if (item.evidence && !answer.includes(item.evidence)) errors.push("평가 기준 근거가 원문에 없습니다.");
  }
  if (new Set(feedback.criteria.map(item => item.name)).size !== feedback.criteria.length || feedback.criteria.length !== QUESTION_CRITERIA[feedback.questionType].length) errors.push("평가 기준이 누락되거나 중복됐습니다.");
  for (const item of feedback.keywords) if (!answer.includes(item.evidence) || !item.evidence.includes(item.text)) errors.push("키워드는 답변의 실제 표현이어야 합니다.");
  for (const item of feedback.annotations) if (!answer.includes(item.quote)) errors.push("원문 표시 근거가 없습니다.");
  if (feedback.nextTurn.action === "follow_up" && (!feedback.nextTurn.question || !feedback.nextTurn.evidence || !answer.includes(feedback.nextTurn.evidence))) errors.push("꼬리질문의 답변 근거가 없습니다.");
  return errors;
}
const tokenCount = z.number().int().nonnegative().nullable();
export const interviewFeedbackResultSchema = z.object({
  feedback: z.union([interviewCoachOutputSchema, interviewFeedbackOutputSchema]),
  metadata: z.object({
    model: z.string(), promptVersion: z.string(), rubricVersion: z.string(), schemaVersion: z.string(),
    inputTokens: tokenCount, outputTokens: tokenCount, totalTokens: tokenCount,
    responseId: z.string().nullable(), requestId: z.uuid(),
  }),
});
export const interviewFeedbackStatusSchema = z.object({
  configured: z.boolean(), authorized: z.boolean(), enabled: z.boolean(),
  model: z.string(), transcriptionModel: z.string(),
  limits: z.object({ maxAudioBytes: z.number(), maxDurationSeconds: z.number(), maxAnswerCharacters: z.number(), maxOutputTokens: z.number(), callsPerHour: z.number() }),
  reason: z.string().nullable(),
});
export const interviewTranscriptionResultSchema = z.object({
  text: z.string().max(12_000),
  segments: z.array(z.object({ start: z.number().nonnegative(), end: z.number().nonnegative(), text: z.string() })).max(400),
  durationSeconds: z.number().positive().max(180),
  metadata: z.object({ model: z.string(), provider: z.literal("openai"), schemaVersion: z.string(), requestId: z.uuid() }),
  notice: z.string(),
});
export type InterviewFeedbackResult = z.infer<typeof interviewFeedbackResultSchema>;
export type InterviewFeedbackStatus = z.infer<typeof interviewFeedbackStatusSchema>;
export type InterviewTranscriptionResult = z.infer<typeof interviewTranscriptionResultSchema>;

/** Grounding validation, not a guarantee that every semantic claim is correct. */
export function validateInterviewFeedbackEvidence(answerText: string, feedback: InterviewFeedbackOutput): string[] {
  const errors: string[] = [];
  for (const item of [...feedback.strengths, ...feedback.priorities]) {
    if (!answerText.includes(item.evidence)) errors.push("답변 원문에 없는 근거 인용입니다.");
  }
  for (const part of Object.values(feedback.star)) {
    if ((part.status === "present" || part.status === "partial") && !part.evidence) errors.push("STAR 판단에 근거가 없습니다.");
    if (part.evidence && !answerText.includes(part.evidence)) errors.push("STAR 근거가 답변 원문과 다릅니다.");
  }
  const originalNumbers = new Set(answerText.match(/\d+(?:[.,]\d+)*(?:%|퍼센트)?/g) ?? []);
  for (const revision of [feedback.betterAnswer, ...feedback.priorities.map(item => item.improvedAnswer)]) {
    if ((revision.match(/\d+(?:[.,]\d+)*(?:%|퍼센트)?/g) ?? []).some(number => !originalNumbers.has(number))) {
      errors.push("수정 답변에 원문에 없는 숫자가 있습니다.");
    }
  }
  return [...new Set(errors)];
}

/** Korean whitespace-unit rate is a transcript observation, not pronunciation or fluency scoring. */
export function observeTranscriptDelivery(text: string, durationSeconds: number | null) {
  const units = text.trim().split(/\s+/u).filter(Boolean).length;
  const fillers = text.match(/(?:^|[\s,.!?])(?:음|어|그니까|그러니까|뭐랄까)(?=[\s,.!?]|$)/gu) ?? [];
  return {
    whitespaceUnits: units,
    unitsPerMinute: durationSeconds && durationSeconds > 0 ? Math.round(units * 60 / durationSeconds) : null,
    visibleFillerCount: fillers.length,
    caveat: "전사문에 남은 공백 단위·표현만 셉니다. STT가 생략한 말, 실제 발음·속도·명료도를 판정하지 않습니다.",
  };
}
