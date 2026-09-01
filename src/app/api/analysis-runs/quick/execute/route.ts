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

/** A retry the database refused, carrying why rather than the orphan path's. */
class QuickRetryRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuickRetryRefusedError";
  }
}

/**
 * 실패를 사람이 다음에 할 일로 옮깁니다.
 *
 * 셋은 다음 행동이 전부 다릅니다 — 설정이 빠진 것은 **운영자만** 고칠 수
 * 있고(다시 눌러도 영원히 같습니다), 모델 쪽 일시 오류는 잠시 뒤 다시 하면
 * 되고, 이용권 문제는 결제 상태를 봐야 합니다. 하나로 뭉치면 셋 다 "다시
 * 시도"만 누르다 끝납니다.
 */
function classifyExecutionFailure(detail: string): { code: string; message: string } {
  if (detail.startsWith("OPENAI_CONFIGURATION_MISSING") || detail.startsWith("SUPABASE_NOT_CONFIGURED")) {
    return {
      code: "SERVICE_CONFIG",
      message: "서비스 설정 문제로 분석을 시작하지 못했습니다. 결제·이용권은 그대로 있으니 잠시 후 다시 시도해 주시고, 계속되면 문의해 주세요.",
    };
  }
  if (/ENTITLEMENT|REWARD_CREDIT/i.test(detail)) {
    return {
      code: "ENTITLEMENT",
      message: "이용권 확인에 실패했습니다. 결제·이용권은 그대로 있습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
  if (/OPENAI|RESPONSES|MODEL|\b429\b|\b5\d\d\b|timeout|ECONNRESET|fetch failed/i.test(detail)) {
    return {
      code: "AI_PROVIDER",
      message: "분석 엔진이 일시적으로 응답하지 않았습니다. 추가 결제 없이 다시 시도하실 수 있습니다.",
    };
  }
  return {
    code: "UNKNOWN",
    message: "분석을 완료하지 못했습니다. 추가 결제 없이 다시 시도하실 수 있습니다.",
  };
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
        // The orphan path only covers runs left stranded by a lost worker. It
        // used to run for *every* retry refusal, and when it then found no
        // orphaned row it threw its own "no rows" error — replacing the real
        // reason with PGRST116 and turning a legitimate "this run cannot be
        // retried" into an opaque 500. Keep the original refusal.
        try { await repository.prepareOrphanRetry(body.analysisRunId); }
        catch { throw new QuickRetryRefusedError(error.message); }
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
        // The codes alone say which rule fired, not which quote or number
        // tripped it — and the detail never reaches the retry screen, so this
        // log is the only place the cause is visible.
        console.error(`quick_analysis_validation_blocked:${blockingIssues.map((issue) => issue.code).join(",")}`);
        for (const issue of blockingIssues) console.error(`  ${issue.code}: ${issue.message}`);
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
        await sendAnalysisCompleteEmail({ to: data.user.email, resultUrl: `${getCheckoutReturnOrigin(request.nextUrl)}/result?analysisRunId=${body.analysisRunId}`, feedbackUrl: `${getCheckoutReturnOrigin(request.nextUrl)}/feedback/${body.analysisRunId}` });
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
    // A run in the wrong state for a retry is not a server fault, and a 500
    // tells the applicant nothing they can act on.
    if (error instanceof QuickRetryRefusedError) {
      console.error(`quick_analysis_retry_refused:${error.message}`);
      return NextResponse.json({
        error: "이 분석은 다시 시도할 수 없습니다. 결제는 그대로 있으니 고객센터로 문의해 주세요.",
        code: "RETRY_NOT_ALLOWED",
        ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}),
      }, { status: 409 });
    }
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    console.error(`quick_analysis_execution_failed:${detail}`);
    // 사유를 통째로 내보내지는 않되, **무엇 때문인지 갈래는** 알려 줍니다.
    // 운영에서 사유를 전부 숨겼더니 화면에는 "분석을 완료하지 못했습니다"만
    // 남았고, 그 한 문장으로는 설정이 빠진 것인지 잠시 실패한 것인지 구분할
    // 수 없어 매번 로그를 열어야 했습니다. 갈래 이름에는 키도 내부 경로도
    // 들어가지 않습니다.
    const failure = classifyExecutionFailure(detail);
    return NextResponse.json({
      error: failure.message,
      code: failure.code,
      ...(process.env.NODE_ENV !== "production" ? { detail, diagnostic: detail } : {}),
    }, { status: 500 });
  }
}
