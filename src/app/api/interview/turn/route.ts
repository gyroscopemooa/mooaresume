import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resultDocumentSchema } from "@/domain/result-document";
import { resolveModelConfig } from "@/server/ai/model-config";
import { runInterviewTurn } from "@/server/ai/interview/interview-turn-gateway";
import { recordInterviewTurnAttempt } from "@/server/analysis/interview-attempt-ledger";

export const runtime = "nodejs";

/**
 * 답변 하나를 제출하고 평가+다음 질문을 받는다.
 *
 * 컨텍스트(회사/직무/위험지점/지금까지의 대화)는 클라이언트가 보낸 값을
 * 믿지 않고 전부 서버가 다시 읽는다 — final-patch 라우트와 같은 이유:
 * "RLS가 남의 결과를 막습니다. 여기서 다시 소유자를 비교하지 않는 이유는
 * 조건이 두 곳에 흩어지면 한쪽만 고쳐지기 때문입니다"와 같은 원칙을
 * 여기서는 "컨텍스트를 클라이언트가 아니라 서버가 읽는다"로 적용한다.
 */

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  question: z.string().min(1).max(2000),
  answer: z.string().trim().min(1).max(4000),
});

const sessionRowSchema = z.object({
  id: z.string().uuid(),
  analysis_run_id: z.string().uuid(),
  status: z.enum(["ACTIVE", "COMPLETED", "ABANDONED"]),
  max_turns: z.number().int().positive(),
  turns_used: z.number().int().nonnegative(),
  seed_questions: z.array(z.object({ question: z.string() }).loose()),
  turn_failure_count: z.number().int().nonnegative(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  // RLS가 남의 세션을 걸러 준다 — 없으면 본인 것이 아니거나 존재하지 않는 것.
  const { data: sessionRow } = await supabase
    .from("interview_sessions")
    .select("id, analysis_run_id, status, max_turns, turns_used, seed_questions, turn_failure_count")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  const session = sessionRowSchema.safeParse(sessionRow);
  if (!session.success) return NextResponse.json({ error: "모의면접 세션을 찾지 못했습니다." }, { status: 404 });
  if (session.data.status !== "ACTIVE") {
    return NextResponse.json({ error: "이미 끝난 모의면접입니다." }, { status: 409 });
  }
  if (session.data.turns_used >= session.data.max_turns) {
    return NextResponse.json({ error: "이번 모의면접의 질문을 모두 진행했습니다." }, { status: 409 });
  }
  // 같은 턴이 이미 3번 실패했으면 더 시도하지 않는다 — 실패한 시도도 비용이
  // 나가므로(interview_turn_attempts에 기록됨), 안 풀리는 턴을 붙잡고
  // 무한정 재시도하게 두지 않는다. 지금까지 답한 턴이 있으면 그걸로
  // 마무리하도록 클라이언트에 신호를 보낸다.
  if (session.data.turn_failure_count >= 3) {
    return NextResponse.json({
      error: "이 질문을 계속 처리하지 못하고 있습니다.",
      code: "TURN_FAILURE_LIMIT_REACHED",
      shouldFinish: session.data.turns_used >= 1,
    }, { status: 422 });
  }

  const { data: resultRow } = await supabase
    .from("analysis_results")
    .select("result_data")
    .eq("analysis_run_id", session.data.analysis_run_id)
    .maybeSingle();
  const result = resultDocumentSchema.safeParse(resultRow?.result_data);
  if (!result.success) return NextResponse.json({ error: "분석 결과를 확인하지 못했습니다." }, { status: 404 });

  const { data: turnRows } = await supabase
    .from("interview_turns")
    .select("turn_no, question, answer")
    .eq("session_id", session.data.id)
    .order("turn_no", { ascending: true });
  const history = (turnRows ?? []).map((row) => ({ question: String(row.question), answer: String(row.answer) }));

  const askedQuestions = new Set([...history.map((turn) => turn.question), parsed.data.question]);
  const remainingSeedQuestions = session.data.seed_questions
    .map((item) => item.question)
    .filter((question) => !askedQuestions.has(question));

  const nextTurnNo = session.data.turns_used + 1;
  const isFinalTurn = nextTurnNo >= session.data.max_turns;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseModel = process.env.OPENAI_MODEL?.trim();
  if (!apiKey || !baseModel) return NextResponse.json({ error: "지금은 모의면접을 진행할 수 없습니다." }, { status: 503 });
  const { model, reasoningEffort } = resolveModelConfig("FINAL", baseModel);

  let turnResult: Awaited<ReturnType<typeof runInterviewTurn>>;
  try {
    turnResult = await runInterviewTurn({
      company: result.data.company,
      role: result.data.role,
      interviewRisks: result.data.interviewRisks.map((risk) => ({ topic: risk.topic, risk: risk.risk, evidenceQuote: risk.evidenceQuote })),
      remainingSeedQuestions,
      history,
      question: parsed.data.question,
      answer: parsed.data.answer,
      isFinalTurn,
    }, { apiKey, model, reasoningEffort });
  } catch (error) {
    void recordInterviewTurnAttempt({
      sessionId: session.data.id,
      ownerUserId: authData.user.id,
      turnNo: nextTurnNo,
      outcome: "PROVIDER_FAILED",
      failureCode: error instanceof Error ? error.message.slice(0, 200) : "UNKNOWN_ERROR",
    });
    const { data: failureCount } = await supabase.rpc("record_interview_turn_failure", {
      p_session_id: session.data.id,
    });
    console.error("interview_turn_failed", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    return NextResponse.json({
      error: "답변을 평가하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      code: "PROVIDER_FAILED",
      shouldFinish: (failureCount as number | null) === 3 && session.data.turns_used >= 1,
    }, { status: 502 });
  }

  void recordInterviewTurnAttempt({
    sessionId: session.data.id,
    ownerUserId: authData.user.id,
    turnNo: nextTurnNo,
    outcome: "COMPLETED",
    usage: { model, responseId: turnResult.responseId, ...turnResult.usage },
  });

  const { data: recorded, error: recordError } = await supabase.rpc("record_interview_turn", {
    p_session_id: session.data.id,
    p_turn_no: nextTurnNo,
    p_question: parsed.data.question,
    p_answer: parsed.data.answer,
    p_evaluation: turnResult.output.evaluation,
    p_next_question: turnResult.output.nextQuestion,
    p_model: model,
  });
  if (recordError) {
    return NextResponse.json({ error: "답변을 기록하지 못했습니다.", code: recordError.code }, { status: 409 });
  }

  return NextResponse.json({
    evaluation: turnResult.output.evaluation,
    nextQuestion: turnResult.output.nextQuestion,
    isReadyToFinish: turnResult.output.isReadyToFinish || isFinalTurn,
    turnsUsed: (recorded as { turnsUsed?: number } | null)?.turnsUsed ?? nextTurnNo,
    maxTurns: session.data.max_turns,
  });
}
