import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAnalysisCompleteEmail } from "@/server/notifications/analysis-complete-email";
import { OpenAIResponsesGateway } from "@/server/ai/quick/openai-responses-gateway";
import { createQuickAnalysisResult, QuickQuestionResultMissingError } from "@/server/ai/quick/provider";
import { BLOCKING_VALIDATION_CODES, validateQuickAnalysis } from "@/server/ai/quick/validator";
import { advanceQuickBackgroundAnalysis } from "@/server/analysis/quick-background-execution";
import { refundTimedOutQuickAnalysis } from "@/server/billing/quick-timeout-refund";
import { SupabaseQuickAnalysisRunRepository } from "@/server/analysis/supabase-quick-analysis-run-repository";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Finishes analyses the browser is no longer watching.
 *
 * Only quick-checkout-return.tsx ever drove a run to completion, so closing the
 * tab left the model's finished work unfetched: the run sat in RUNNING, the
 * completion email never sent, and the ten-minute refund — also triggered from
 * the open page — never fired either. On a product that takes five to ten
 * minutes, "do not close this tab" is not a reasonable condition to attach to a
 * payment that has already gone through.
 *
 * See docs/background-analysis-completion-decision.md. Deliberately calls the
 * same functions the browser path calls; a second implementation would drift.
 */

// One run can involve an OpenAI poll, a validation pass and an email, so a
// batch is kept small enough to finish inside the request.
const MAX_RUNS_PER_CALL = 5;
// Matches the browser path: a run older than this is refunded rather than waited on.
const TIMEOUT_MINUTES = 10;

type RunRow = { id: string; owner_user_id: string; started_at: string | null };

function serviceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_CONFIGURATION_MISSING");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function advanceOne(run: RunRow, origin: string) {
  const startedAt = run.started_at ? new Date(run.started_at).getTime() : null;
  const runningMinutes = startedAt ? (Date.now() - startedAt) / 60_000 : 0;
  if (runningMinutes > TIMEOUT_MINUTES) {
    const refund = await refundTimedOutQuickAnalysis({ analysisRunId: run.id, ownerUserId: run.owner_user_id });
    return { analysisRunId: run.id, outcome: "REFUNDED" as const, detail: refund };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) throw new Error("OPENAI_CONFIGURATION_MISSING");

  const repository = new SupabaseQuickAnalysisRunRepository(run.owner_user_id);
  const step = await advanceQuickBackgroundAnalysis({
    analysisRunId: run.id,
    repository,
    gateway: new OpenAIResponsesGateway({ apiKey, model }),
  });
  if (step.status === "started") return { analysisRunId: run.id, outcome: "STARTED" as const };
  if (step.response.status === "pending") return { analysisRunId: run.id, outcome: "PENDING" as const };
  if (step.response.status === "failed") {
    await repository.fail(run.id, "AI_PROVIDER_FAILED", true);
    return { analysisRunId: run.id, outcome: "PROVIDER_FAILED" as const };
  }

  const blocking = validateQuickAnalysis(step.request, step.response.result.output)
    .filter((issue) => BLOCKING_VALIDATION_CODES.has(issue.code));
  if (blocking.length > 0) {
    await repository.fail(run.id, "AI_OUTPUT_VALIDATION_FAILED", true);
    for (const issue of blocking) console.error(`advance ${run.id} ${issue.code}: ${issue.message}`);
    return { analysisRunId: run.id, outcome: "VALIDATION_FAILED" as const };
  }

  try {
    await repository.complete(run.id, createQuickAnalysisResult(step.request, step.response.result));
  } catch (error) {
    if (error instanceof QuickQuestionResultMissingError) {
      await repository.fail(run.id, "AI_OUTPUT_VALIDATION_FAILED", true);
      return { analysisRunId: run.id, outcome: "QUESTION_MISSING" as const };
    }
    // complete_quick_analysis refuses a run that is no longer RUNNING, which is
    // exactly what happens when the open tab got there first. Not an error.
    if (error instanceof Error && error.message.includes("ANALYSIS_RUN_NOT_COMPLETABLE")) {
      return { analysisRunId: run.id, outcome: "ALREADY_DONE" as const };
    }
    throw error;
  }

  const { data: owner } = await serviceRoleClient().auth.admin.getUserById(run.owner_user_id);
  if (owner?.user?.email) {
    try {
      await sendAnalysisCompleteEmail({ to: owner.user.email, resultUrl: `${origin}/result?analysisRunId=${run.id}` });
    } catch (emailError) {
      console.error("advance_email_failed", emailError instanceof Error ? emailError.message : "UNKNOWN_ERROR");
    }
  }
  return { analysisRunId: run.id, outcome: "COMPLETED" as const };
}

export async function POST(request: NextRequest) {
  const secret = process.env.ANALYSIS_CRON_SECRET?.trim();
  // An unset secret must not leave this open. A missing setting is a refusal.
  if (!secret) return NextResponse.json({ error: "스케줄러가 설정되지 않았습니다." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 401 });
  }

  try {
    const { data: runs, error } = await serviceRoleClient()
      .from("analysis_runs")
      .select("id, owner_user_id, started_at")
      .eq("status", "RUNNING")
      .order("started_at", { ascending: true })
      .limit(MAX_RUNS_PER_CALL);
    if (error) throw new Error(`ANALYSIS_RUN_QUERY_FAILED:${error.code}`);

    const origin = request.nextUrl.origin;
    const results = [];
    for (const run of runs ?? []) {
      try {
        results.push(await advanceOne(run as RunRow, origin));
      } catch (runError) {
        // One stuck run must not stop the rest of the batch.
        console.error(`advance_failed:${run.id}`, runError instanceof Error ? runError.message : "UNKNOWN_ERROR");
        results.push({ analysisRunId: run.id, outcome: "ERROR" as const });
      }
    }
    return NextResponse.json({ examined: results.length, results });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    console.error(`advance_batch_failed:${detail}`);
    return NextResponse.json({ error: "진행 중인 분석을 처리하지 못했습니다." }, { status: 500 });
  }
}
