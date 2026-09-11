import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { interviewQuestionSchema } from "@/domain/result-document";

export const runtime = "nodejs";

/**
 * 모의면접 세션을 시작(또는 진행 중인 세션을 이어받음).
 *
 * AI를 부르지 않습니다 — 첫 질문은 이미 결제된 FINAL 분석의 정적
 * interviewQuestions에서 가져오므로 비용이 들지 않습니다. 실제 AI 호출은
 * 답변을 제출하는 /api/interview/turn부터 시작됩니다.
 */

const bodySchema = z.object({
  analysisRunId: z.string().uuid(),
  // "약점만 다시 연습" — 있으면 이 id들만 시드로 쓴다.
  focusQuestionIds: z.array(z.string().min(1)).min(1).optional(),
});

const rpcResultSchema = z.object({
  sessionId: z.string().uuid(),
  maxTurns: z.number().int().positive(),
  turnsUsed: z.number().int().nonnegative(),
  seedQuestions: z.array(interviewQuestionSchema),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("begin_interview_session", {
    p_analysis_run_id: parsed.data.analysisRunId,
    p_focus_question_ids: parsed.data.focusQuestionIds ?? null,
  });

  if (error) {
    const status = error.code === "P0002" ? 404 : error.code === "55000" ? 409 : 400;
    const message = error.message.includes("INTERVIEW_NOT_AVAILABLE")
      ? "이 분석 결과는 모의면접을 시작할 수 없습니다."
      : error.message.includes("SESSION_LIMIT_REACHED")
        ? "이 분석에서는 모의면접을 더 시작할 수 없습니다."
        : error.message.includes("NO_SEED_QUESTIONS")
          ? "이 분석에는 면접 질문이 없어 모의면접을 시작할 수 없습니다."
          : "모의면접을 시작하지 못했습니다.";
    return NextResponse.json({ error: message, code: error.code }, { status });
  }

  const result = rpcResultSchema.safeParse(data);
  if (!result.success) {
    return NextResponse.json({ error: "모의면접 시작 결과를 확인하지 못했습니다." }, { status: 502 });
  }

  return NextResponse.json(result.data, { status: 201 });
}
