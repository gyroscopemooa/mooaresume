import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * `attempt-ledger.ts`의 모의면접용 짝. 같은 이유로 존재합니다 — 검증에서
 * 걸리거나 실패한 호출도 모델이 만들어 낸 만큼 요금이 나가는데, 세션/턴
 * 행만 보면 그 비용이 어디에도 안 남습니다. 실패해도 분석(턴 진행) 자체는
 * 막지 않습니다 — 원장 기록 실패가 사용자 경험을 막으면 안 됩니다.
 */

export type InterviewAttemptOutcome = "COMPLETED" | "PROVIDER_FAILED" | "ERROR";

export type InterviewAttemptUsage = {
  model?: string | null;
  responseId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
};

export type RecordInterviewAttemptInput = {
  sessionId: string;
  ownerUserId: string;
  turnNo: number;
  outcome: InterviewAttemptOutcome;
  failureCode?: string | null;
  usage?: InterviewAttemptUsage;
};

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function recordInterviewTurnAttempt(
  input: RecordInterviewAttemptInput,
  client = serviceClient(),
): Promise<"RECORDED" | "SKIPPED" | "FAILED"> {
  if (!client) return "SKIPPED";

  try {
    const { error } = await client.from("interview_turn_attempts").insert({
      session_id: input.sessionId,
      owner_user_id: input.ownerUserId,
      turn_no: input.turnNo,
      outcome: input.outcome,
      failure_code: input.failureCode ?? null,
      model: input.usage?.model ?? null,
      response_id: input.usage?.responseId ?? null,
      input_tokens: input.usage?.inputTokens ?? null,
      output_tokens: input.usage?.outputTokens ?? null,
      total_tokens: input.usage?.totalTokens ?? null,
    });
    if (error) throw new Error(error.message);
    return "RECORDED";
  } catch (error) {
    console.error(
      "interview_turn_attempt_not_recorded",
      input.sessionId,
      error instanceof Error ? error.message : "UNKNOWN_ERROR",
    );
    return "FAILED";
  }
}
