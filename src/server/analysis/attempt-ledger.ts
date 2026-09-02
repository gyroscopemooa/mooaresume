import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * 시도 한 번을 원장에 적습니다.
 *
 * ------------------------------------------------------------------
 * 적는 자리가 왜 여기인가
 * ------------------------------------------------------------------
 * OpenAI 응답을 받아 든 자리에서만 토큰 수를 알 수 있습니다. 그 자리를
 * 지나면 값이 사라지고, 특히 **검증에서 걸린 응답**은 지금까지 아무 데도
 * 남지 않은 채 버려졌습니다 — 모델이 끝까지 만들어 낸 것이라 요금은
 * 그대로 나갔는데도요.
 *
 * ------------------------------------------------------------------
 * 실패해도 분석을 막지 않습니다
 * ------------------------------------------------------------------
 * 원장은 관리용 기록이지 분석의 일부가 아닙니다. 표가 아직 없거나(마이그레이션
 * 전) 키가 없어도 분석은 그대로 끝나야 합니다. 그래서 모든 오류를 삼키고
 * 로그만 남깁니다 — **기록을 남기려다 결과를 잃는 것이 훨씬 나쁩니다.**
 */

export type AttemptOutcome =
  | "COMPLETED"
  | "VALIDATION_FAILED"
  | "QUESTION_MISSING"
  | "PROVIDER_FAILED"
  | "ERROR";

export type AttemptUsage = {
  model?: string | null;
  responseId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
};

export type RecordAttemptInput = {
  analysisRunId: string;
  ownerUserId: string;
  outcome: AttemptOutcome;
  failureCode?: string | null;
  /** 브라우저가 끝낸 건지, 탭이 닫혀 스케줄러가 끝낸 건지. */
  source: "BROWSER" | "CRON";
  usage?: AttemptUsage;
};

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function recordAnalysisAttempt(
  input: RecordAttemptInput,
  client = serviceClient(),
): Promise<"RECORDED" | "SKIPPED" | "FAILED"> {
  if (!client) return "SKIPPED";

  try {
    // 몇 번째 시도였는지는 세지 않고 물어봅니다. 브라우저와 스케줄러가 같은
    // 분석을 동시에 밀 수 있어, 원장 줄 수로 역산하면 어긋납니다.
    const { data: run } = await client
      .from("analysis_runs")
      .select("attempt_count")
      .eq("id", input.analysisRunId)
      .maybeSingle();

    const { error } = await client.from("analysis_run_attempts").insert({
      analysis_run_id: input.analysisRunId,
      owner_user_id: input.ownerUserId,
      attempt_no: (run?.attempt_count as number | null) ?? 0,
      outcome: input.outcome,
      failure_code: input.failureCode ?? null,
      source: input.source,
      model: input.usage?.model ?? null,
      response_id: input.usage?.responseId ?? null,
      input_tokens: input.usage?.inputTokens ?? null,
      output_tokens: input.usage?.outputTokens ?? null,
      total_tokens: input.usage?.totalTokens ?? null,
    });
    if (error) throw new Error(error.message);
    return "RECORDED";
  } catch (error) {
    // 표가 아직 없는 환경(마이그레이션 전)도 여기로 옵니다. 조용히 넘기되
    // 로그에는 남겨, 원가가 비어 보일 때 이유를 찾을 수 있게 합니다.
    console.error(
      "analysis_attempt_not_recorded",
      input.analysisRunId,
      error instanceof Error ? error.message : "UNKNOWN_ERROR",
    );
    return "FAILED";
  }
}
