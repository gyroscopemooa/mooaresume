import { z } from "zod";
import { interviewQuestionSchema } from "@/domain/result-document";

/**
 * FINAL 인터랙티브 모의면접의 공유 타입.
 *
 * 서버 라우트·RPC·클라이언트 컴포넌트가 전부 이 스키마를 기준으로 삼는다.
 * 숫자 점수·합격확률 필드가 하나도 없는 것은 실수가 아니다 — AGENTS.md가
 * 금지한다: "Never present an employment success probability", 모든 질적
 * 판단은 근거가 있어야 한다.
 */

export const DEFAULT_INTERVIEW_MAX_TURNS = 5;
export const MAX_INTERVIEW_SESSIONS_PER_RUN = 3;

export const interviewEvaluationSchema = z.object({
  strengths: z.array(z.string().min(1)).max(5),
  gaps: z.array(z.string().min(1)).max(5),
  note: z.string().min(1),
});
export type InterviewEvaluation = z.infer<typeof interviewEvaluationSchema>;

export const interviewTurnRecordSchema = z.object({
  turnNo: z.number().int().positive(),
  question: z.string().min(1),
  answer: z.string().min(1),
  evaluation: interviewEvaluationSchema,
});
export type InterviewTurnRecord = z.infer<typeof interviewTurnRecordSchema>;

export const interviewWeakAreaSchema = z.object({
  topic: z.string().min(1),
  evidence: z.string().min(1),
  // "왜" 이게 문제이고 실제 면접에서도 계속 나올 만한지 — evidence(무엇이
  // 나왔는지)와 분리된 해석 문장.
  reason: z.string().min(1),
  // 꼬리질문 턴처럼 원래 questionId가 없는 턴에서 나온 약점은 빈 배열일 수
  // 있다 — 모델에게 없는 id를 지어내게 하지 않는다(interview-report-gateway.ts 참고).
  relatedQuestionIds: z.array(z.string().min(1)),
});
export type InterviewWeakArea = z.infer<typeof interviewWeakAreaSchema>;

export const interviewLikelyRiskSchema = z.object({
  situation: z.string().min(1),
  reason: z.string().min(1),
  evidence: z.string().min(1),
});
export type InterviewLikelyRisk = z.infer<typeof interviewLikelyRiskSchema>;

export const interviewReportSchema = z.object({
  summary: z.string().min(1),
  strengthAreas: z.array(z.string().min(1)).max(5),
  weakAreas: z.array(interviewWeakAreaSchema).max(5),
  // "~한 이유로 ~한 면접 상황이 발생할 수 있다" — FINAL 분석의 interviewRisks와
  // 이번 세션의 답변 패턴을 근거로 한 예측. 근거가 부족하면 빈 배열.
  likelyInterviewRisks: z.array(interviewLikelyRiskSchema).max(5),
  recommendedNextSteps: z.array(z.string().min(1)).min(1).max(5),
});
export type InterviewReport = z.infer<typeof interviewReportSchema>;

export const interviewSessionStateSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(["ACTIVE", "COMPLETED", "ABANDONED"]),
  maxTurns: z.number().int().positive(),
  turnsUsed: z.number().int().nonnegative(),
  seedQuestions: z.array(interviewQuestionSchema),
  /** 재개 시 다음에 물어야 할 질문 — 세션에 저장돼 있어 다른 페이지를 갔다 와도 이어진다. */
  pendingQuestion: z.string().nullable().optional(),
  finalReport: interviewReportSchema.nullable().optional(),
});
export type InterviewSessionState = z.infer<typeof interviewSessionStateSchema>;
