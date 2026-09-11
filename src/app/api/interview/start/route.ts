import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { interviewQuestionSchema } from "@/domain/result-document";
import { interviewEvaluationSchema } from "@/domain/interview";

export const runtime = "nodejs";

/**
 * 모의면접 세션을 시작(또는 진행 중인 세션을 이어받음).
 *
 * AI를 부르지 않습니다 — 첫 질문은 이미 결제된 FINAL 분석의 정적
 * interviewQuestions에서 가져오므로 비용이 들지 않습니다. 실제 AI 호출은
 * 답변을 제출하는 /api/interview/turn부터 시작됩니다.
 *
 * 진행 중이던 세션을 이어받는 경우, 이미 답한 턴 기록과 다음에 물어야 할
 * 질문(pendingQuestion)도 같이 돌려준다 — 다른 페이지에 갔다 와도 처음
 * 질문부터 다시 시작하지 않게 하기 위해서다. 그렇지 않으면 이미 답한
 * 질문을 다시 답할 때 그게 새 턴으로 기록되어 턴 예산만 헛되이 줄어든다.
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
  pendingQuestion: z.string().nullable(),
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

  // 새 세션이면 history는 비어 있는 게 정상 — 굳이 빈 select를 또 던지지 않는다.
  let history: Array<{ turnNo: number; question: string; answer: string; evaluation: unknown }> = [];
  if (result.data.turnsUsed > 0) {
    const { data: turnRows } = await supabase
      .from("interview_turns")
      .select("turn_no, question, answer, evaluation")
      .eq("session_id", result.data.sessionId)
      .order("turn_no", { ascending: true });
    history = (turnRows ?? []).map((row) => {
      const evaluation = interviewEvaluationSchema.safeParse(row.evaluation);
      return {
        turnNo: Number(row.turn_no),
        question: String(row.question),
        answer: String(row.answer),
        evaluation: evaluation.success ? evaluation.data : { strengths: [], gaps: [], note: "" },
      };
    });
  }

  return NextResponse.json({ ...result.data, history }, { status: 201 });
}
