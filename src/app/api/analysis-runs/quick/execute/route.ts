import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendAnalysisCompleteEmail } from "@/server/notifications/analysis-complete-email";
import { OpenAIResponsesGateway } from "@/server/ai/quick/openai-responses-gateway";
import { createQuickAnalysisResult, QuickQuestionResultMissingError } from "@/server/ai/quick/provider";
import { BLOCKING_VALIDATION_CODES, validateQuickAnalysis } from "@/server/ai/quick/validator";
import { advanceQuickBackgroundAnalysis } from "@/server/analysis/quick-background-execution";
import { getCheckoutReturnOrigin } from "@/server/billing/checkout-return-origin";
import { SupabaseQuickAnalysisRunRepository } from "@/server/analysis/supabase-quick-analysis-run-repository";

export const runtime = "nodejs";
export const maxDuration = 600;

const bodySchema = z.object({ analysisRunId: z.string().uuid(), retry: z.boolean().optional() });

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    return [request.nextUrl.host, request.headers.get("host"), forwardedHost]
      .filter((host): host is string => Boolean(host))
      .includes(originHost);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const body = bodySchema.parse(await request.json());
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;
    if (!apiKey || !model) throw new Error("OPENAI_CONFIGURATION_MISSING");

    const repository = new SupabaseQuickAnalysisRunRepository(data.user.id);
    if (body.retry) {
      try { await repository.prepareRetry(body.analysisRunId); }
      catch (error) {
        if (!(error instanceof Error) || !error.message.startsWith("QUICK_ANALYSIS_RETRY_PREPARE_FAILED:")) throw error;
        await repository.prepareOrphanRetry(body.analysisRunId);
      }
    }
    const gateway = new OpenAIResponsesGateway({ apiKey, model });
    let result;
    try {
      const step = await advanceQuickBackgroundAnalysis({
        analysisRunId: body.analysisRunId,
        repository,
        gateway,
      });
      if (step.status === "started") return NextResponse.json({ analysisRunId: step.analysisRunId, status: "RUNNING" }, { status: 202 });
      const background = step.response;
      if (background.status === "pending") return NextResponse.json({ analysisRunId: body.analysisRunId, status: "RUNNING" }, { status: 202 });
      if (background.status === "failed") {
        await repository.fail(body.analysisRunId, "AI_PROVIDER_FAILED", true);
        throw new Error(`OPENAI_BACKGROUND_FAILED:${background.reason}`);
      }
      // The synchronous orchestrator ran this guard; the background path
      // dropped it, letting fabricated numbers and unsupported evidence reach
      // the applicant unchecked. Only factuality issues block — see
      // BLOCKING_VALIDATION_CODES.
      const blockingIssues = validateQuickAnalysis(step.request, background.result.output)
        .filter((issue) => BLOCKING_VALIDATION_CODES.has(issue.code));
      if (blockingIssues.length > 0) {
        await repository.fail(body.analysisRunId, "AI_OUTPUT_VALIDATION_FAILED", true);
        const detail = blockingIssues.map((issue) => issue.message).join(" ");
        console.error(`quick_analysis_validation_blocked:${blockingIssues.map((issue) => issue.code).join(",")}`);
        return NextResponse.json({ error: "사실 확인에 실패해 결과를 보류했습니다.", detail, code: "OUTPUT_VALIDATION_FAILED" }, { status: 422 });
      }

      try {
        result = createQuickAnalysisResult(step.request, background.result);
      } catch (assemblyError) {
        if (!(assemblyError instanceof QuickQuestionResultMissingError)) throw assemblyError;
        // Assembly failures used to leave the run sitting in RUNNING until the
        // 10-minute timeout refund fired, with the applicant told only that
        // "분석을 완료하지 못했습니다". Record the failure so a retry is
        // possible, and say which question was not covered.
        await repository.fail(body.analysisRunId, "AI_OUTPUT_VALIDATION_FAILED", true);
        return NextResponse.json({
          error: assemblyError.userMessage,
          detail: assemblyError.userMessage,
          code: "QUESTION_RESULT_MISSING",
        }, { status: 422 });
      }
      await repository.complete(body.analysisRunId, result);
    } catch (executionError) {
      if (!(executionError instanceof Error) || !executionError.message.startsWith("QUICK_ANALYSIS_RUNNING_CONTEXT_FAILED:")) throw executionError;
      const context = await repository.begin(body.analysisRunId);
      const responseId = await gateway.startBackground(context.request);
      await repository.saveBackgroundResponse(context.analysisRunId, responseId);
      return NextResponse.json({ analysisRunId: context.analysisRunId, status: "RUNNING" }, { status: 202 });
    }
    if (data.user.email) {
      try {
        await sendAnalysisCompleteEmail({ to: data.user.email, resultUrl: `${getCheckoutReturnOrigin(request.nextUrl)}/result?analysisRunId=${body.analysisRunId}` });
      } catch (emailError) {
        console.error("analysis_complete_email_failed", { error: emailError instanceof Error ? emailError.message : "UNKNOWN_ERROR" });
      }
    }
    return NextResponse.json({
      analysisRunId: body.analysisRunId,
      status: "COMPLETED",
      resultUrl: `/result?analysisRunId=${body.analysisRunId}`,
      result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("quick_analysis_execution_bad_request", { issues: JSON.stringify(error.issues) });
      return NextResponse.json({
        error: "분석 요청 값이 올바르지 않습니다.",
        ...(process.env.NODE_ENV !== "production" ? { issues: error.issues } : {}),
      }, { status: 400 });
    }
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    console.error(`quick_analysis_execution_failed:${detail}`);
    return NextResponse.json({
      error: "분석을 완료하지 못했습니다.",
      ...(process.env.NODE_ENV !== "production" ? { detail, diagnostic: detail } : {}),
    }, { status: 500 });
  }
}
