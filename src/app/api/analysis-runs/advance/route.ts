import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendAnalysisCompleteEmail } from "@/server/notifications/analysis-complete-email";
import { OpenAIResponsesGateway } from "@/server/ai/quick/openai-responses-gateway";
import { createQuickAnalysisResult, QuickQuestionResultMissingError } from "@/server/ai/quick/provider";
import { BLOCKING_VALIDATION_CODES, validateQuickAnalysis } from "@/server/ai/quick/validator";
import { advanceQuickBackgroundAnalysis } from "@/server/analysis/quick-background-execution";
import { refundTimedOutQuickAnalysis } from "@/server/billing/quick-timeout-refund";
import { selectStrandedPaidRuns, type PendingRun } from "@/server/analysis/stranded-paid-runs";
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
 * That same page is also the only thing that ever *starts* a run, so a payment
 * confirmed after the tab closed left the run in PENDING — which this endpoint
 * used not to look at either. That is the worse half of the same bug: the
 * applicant paid and got nothing at all, recoverable only by returning to the
 * exact checkout-return URL. Paid PENDING runs are now started here too; see
 * startStrandedRuns below.
 *
 * See docs/background-analysis-completion-decision.md. Deliberately calls the
 * same functions the browser path calls; a second implementation would drift.
 */

// One run can involve an OpenAI poll, a validation pass and an email, so a
// batch is kept small enough to finish inside the request.
const MAX_RUNS_PER_CALL = 5;
// Matches the browser path: a run older than this is refunded rather than waited on.
const TIMEOUT_MINUTES = 10;
// Starting a run is cheaper than finishing one, but it shares the request with
// the batch above and each start costs an OpenAI call. The job runs every
// minute, so a backlog still drains quickly.
const MAX_STARTS_PER_CALL = 3;
// Leave a fresh payment to the checkout-return page for this long.
const START_GRACE_MINUTES = 2;
// An ACTIVE entitlement is normally consumed within seconds of being granted,
// so the ones still sitting there are close to the whole candidate set — but
// not all of them are live: a run that fails for good, or times out and is
// refunded, hands its entitlement back to ACTIVE and leaves it there. Those
// silt up at the old end of the table, which is why the scan reads newest
// first (see the query). The ceiling is what fits comfortably in the case-id
// list of the follow-up query, which PostgREST takes in the URL.
const MAX_ENTITLEMENTS_SCANNED = 100;

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

/**
 * Finds runs that were paid for and never started.
 *
 * Driven from the entitlements rather than from analysis_runs on purpose. Most
 * PENDING runs are abandoned checkouts and they accumulate forever, so any
 * bounded window over that table would eventually hold nothing but old unpaid
 * rows and new payments would never be seen. An ACTIVE entitlement is the
 * opposite: money taken and nothing delivered yet, a set the happy path empties
 * within seconds of filling.
 *
 * Newest first, because the entitlements left behind by failed and refunded
 * runs never leave ACTIVE. Reading from the old end would eventually spend the
 * whole window on those and starve the payment that just came in; reading from
 * the new end can only ever miss a very old stranded run, which the operator
 * can still see in /meensoo/analyses. Among what it does find, the longest
 * wait is served first — see selectStrandedPaidRuns.
 */
async function findStrandedPaidRuns(client: SupabaseClient): Promise<PendingRun[]> {
  const { data: entitlements, error } = await client
    .from("analysis_entitlements")
    .select("application_case_id, owner_user_id, product, created_at")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(MAX_ENTITLEMENTS_SCANNED);
  if (error) throw new Error(`ENTITLEMENT_QUERY_FAILED:${error.code}`);
  if (!entitlements?.length) return [];

  const { data: runs, error: runError } = await client
    .from("analysis_runs")
    .select("id, application_case_id, owner_user_id, product, created_at")
    .eq("status", "PENDING")
    .in("application_case_id", [...new Set(entitlements.map((row) => row.application_case_id))]);
  if (runError) throw new Error(`PENDING_RUN_QUERY_FAILED:${runError.code}`);
  if (!runs?.length) return [];

  // The checkout intent is the only record tying a payment to one specific
  // run: the entitlement names only the case, and a case can hold an abandoned
  // attempt right next to the one that was actually bought.
  const { data: intents, error: intentError } = await client
    .from("checkout_intents")
    .select("analysis_run_id")
    .eq("status", "SUCCEEDED")
    .in("analysis_run_id", runs.map((row) => row.id));
  if (intentError) throw new Error(`CHECKOUT_INTENT_QUERY_FAILED:${intentError.code}`);

  return selectStrandedPaidRuns({
    entitlements: entitlements.map((row) => ({
      applicationCaseId: row.application_case_id,
      ownerUserId: row.owner_user_id,
      product: row.product,
      createdAt: row.created_at,
    })),
    pendingRuns: runs.map((row) => ({
      id: row.id,
      applicationCaseId: row.application_case_id,
      ownerUserId: row.owner_user_id,
      product: row.product,
      createdAt: row.created_at,
    })),
    paidRunIds: (intents ?? []).map((row) => row.analysis_run_id),
    now: Date.now(),
    graceMs: START_GRACE_MINUTES * 60_000,
    limit: MAX_STARTS_PER_CALL,
  });
}

/**
 * The same two steps the execute route takes for a run it has to start from
 * scratch: begin_quick_analysis consumes the entitlement and moves the run to
 * RUNNING, then a background response is opened and its id stored. From there
 * the RUNNING batch above owns the run — poll, completion email, ten-minute
 * refund — so the applicant gets the result without ever returning to the
 * checkout page.
 */
async function startStrandedRun(run: PendingRun) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) throw new Error("OPENAI_CONFIGURATION_MISSING");

  const repository = new SupabaseQuickAnalysisRunRepository(run.ownerUserId);
  let context;
  try {
    context = await repository.begin(run.id);
  } catch (error) {
    // begin_quick_analysis takes a row lock and requires status PENDING, so a
    // browser that got there first leaves a refusal here rather than a second
    // consumed entitlement. Same shape as ALREADY_DONE above: the work
    // happened, just not by us.
    if (error instanceof Error && error.message.startsWith("QUICK_ANALYSIS_BEGIN_FAILED:")) {
      return { analysisRunId: run.id, outcome: "START_REFUSED" as const, detail: error.message };
    }
    throw error;
  }

  const responseId = await new OpenAIResponsesGateway({ apiKey, model }).startBackground(context.request);
  await repository.saveBackgroundResponse(context.analysisRunId, responseId);
  return { analysisRunId: run.id, outcome: "START_RECOVERED" as const };
}

async function startStrandedRuns(client: SupabaseClient) {
  const results = [];
  for (const run of await findStrandedPaidRuns(client)) {
    try {
      results.push(await startStrandedRun(run));
    } catch (runError) {
      // A run left RUNNING with no response_id here is picked up by the batch
      // above on the next minute, which opens the background response itself.
      console.error(`advance_start_failed:${run.id}`, runError instanceof Error ? runError.message : "UNKNOWN_ERROR");
      results.push({ analysisRunId: run.id, outcome: "START_ERROR" as const });
    }
  }
  return results;
}

export async function POST(request: NextRequest) {
  const secret = process.env.ANALYSIS_CRON_SECRET?.trim();
  // An unset secret must not leave this open. A missing setting is a refusal.
  if (!secret) return NextResponse.json({ error: "스케줄러가 설정되지 않았습니다." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 401 });
  }

  try {
    const client = serviceRoleClient();
    const { data: runs, error } = await client
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

    // Recovery goes last and behind its own guard. The RUNNING runs are
    // counting down to a refund deadline, the stranded ones are already late,
    // and a fault in the newer half must not take the backstop down with it.
    let started: Awaited<ReturnType<typeof startStrandedRuns>> = [];
    try {
      started = await startStrandedRuns(client);
    } catch (startError) {
      console.error(`advance_start_batch_failed:${startError instanceof Error ? startError.message : "UNKNOWN_ERROR"}`);
    }

    return NextResponse.json({ examined: results.length, results, started });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    console.error(`advance_batch_failed:${detail}`);
    return NextResponse.json({ error: "진행 중인 분석을 처리하지 못했습니다." }, { status: 500 });
  }
}
