import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resultDocumentSchema } from "@/domain/result-document";
import { resolveModelConfig } from "@/server/ai/model-config";
import { runInterviewReport } from "@/server/ai/interview/interview-report-gateway";
import { recordInterviewTurnAttempt } from "@/server/analysis/interview-attempt-ledger";

export const runtime = "nodejs";

/**
 * 세션을 마무리하고 최종 리포트를 만든다. 턴 예산에 들어가지 않는 별도
 * 호출이라 여기서만 부른다 — /api/interview/turn은 절대 리포트를 만들지
 * 않는다.
 */

const bodySchema = z.object({ sessionId: z.string().uuid() });

const sessionRowSchema = z.object({
  id: z.string().uuid(),
  analysis_run_id: z.string().uuid(),
  status: z.enum(["ACTIVE", "COMPLETED", "ABANDONED"]),
  turns_used: z.number().int().nonnegative(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const { data: sessionRow } = await supabase
    .from("interview_sessions")
    .select("id, analysis_run_id, status, turns_used")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  const session = sessionRowSchema.safeParse(sessionRow);
  if (!session.success) return NextResponse.json({ error: "모의면접 세션을 찾지 못했습니다." }, { status: 404 });
  if (session.data.status !== "ACTIVE") {
    return NextResponse.json({ error: "이미 끝난 모의면접입니다." }, { status: 409 });
  }
  if (session.data.turns_used < 1) {
    return NextResponse.json({ error: "답변을 하나 이상 진행한 뒤에 마무리할 수 있습니다." }, { status: 409 });
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
    .select("turn_no, question, answer, evaluation")
    .eq("session_id", session.data.id)
    .order("turn_no", { ascending: true });

  const questionIdByText = new Map(result.data.interviewQuestions.map((question) => [question.question, question.id]));
  const turns = (turnRows ?? []).map((row) => ({
    questionId: questionIdByText.get(String(row.question)) ?? null,
    question: String(row.question),
    answer: String(row.answer),
    evaluation: row.evaluation as { strengths: string[]; gaps: string[]; note: string },
  }));

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseModel = process.env.OPENAI_MODEL?.trim();
  if (!apiKey || !baseModel) return NextResponse.json({ error: "지금은 리포트를 만들 수 없습니다." }, { status: 503 });
  const { model, reasoningEffort } = resolveModelConfig("FINAL", baseModel);

  const ledgerTurnNo = session.data.turns_used + 1;
  let reportResult: Awaited<ReturnType<typeof runInterviewReport>>;
  try {
    reportResult = await runInterviewReport(
      { company: result.data.company, role: result.data.role, turns },
      { apiKey, model, reasoningEffort },
    );
  } catch (error) {
    void recordInterviewTurnAttempt({
      sessionId: session.data.id,
      ownerUserId: authData.user.id,
      turnNo: ledgerTurnNo,
      outcome: "PROVIDER_FAILED",
      failureCode: error instanceof Error ? error.message.slice(0, 200) : "UNKNOWN_ERROR",
    });
    console.error("interview_report_failed", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    return NextResponse.json({ error: "리포트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }

  void recordInterviewTurnAttempt({
    sessionId: session.data.id,
    ownerUserId: authData.user.id,
    turnNo: ledgerTurnNo,
    outcome: "COMPLETED",
    usage: { model, responseId: reportResult.responseId, ...reportResult.usage },
  });

  const { error: finishError } = await supabase.rpc("finish_interview_session", {
    p_session_id: session.data.id,
    p_final_report: reportResult.output,
  });
  if (finishError) {
    return NextResponse.json({ error: "리포트를 저장하지 못했습니다.", code: finishError.code }, { status: 409 });
  }

  return NextResponse.json({ finalReport: reportResult.output });
}
