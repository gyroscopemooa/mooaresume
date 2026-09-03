import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendAnalysisCompleteEmail } from "@/server/notifications/analysis-complete-email";
import { OpenAIResponsesGateway } from "@/server/ai/quick/openai-responses-gateway";
import { createQuickAnalysisResult, QuickQuestionResultMissingError } from "@/server/ai/quick/provider";
import { BLOCKING_VALIDATION_CODES, validateQuickAnalysis } from "@/server/ai/quick/validator";
import { advanceQuickBackgroundAnalysis } from "@/server/analysis/quick-background-execution";
import { recordAnalysisAttempt } from "@/server/analysis/attempt-ledger";
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
    // 상태 코드까지 붙입니다. 401(키)·404(모델 이름)·429(한도)는 운영자가 할
    // 일이 전부 다른데, `AI_PROVIDER` 하나로는 셋을 구분할 수 없어 매번
    // 로그를 열어야 했습니다. 숫자에는 키도 본문도 들어가지 않습니다.
    const status = /status=(\d{3})/.exec(detail)?.[1];
    const persistent = status === "401" || status === "403" || status === "404";
    return {
      code: status ? `AI_PROVIDER_${status}` : "AI_PROVIDER",
      message: persistent
        // 키나 모델 이름이 틀린 것이라 다시 눌러도 같습니다. 그 사실을
        // 말해 주지 않으면 같은 버튼을 열 번 누릅니다.
        ? "분석 엔진 설정에 문제가 있어 시작하지 못했습니다. 결제·이용권은 그대로 있으니 문의해 주세요."
        : "분석 엔진이 일시적으로 응답하지 않았습니다. 추가 결제 없이 다시 시도하실 수 있습니다.",
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

  // 바깥 catch에서도 쓸 수 있게 밖에 둡니다.
  //
  // 여기서 무엇이 터지든 `begin_quick_analysis`는 이미 이용권을 소모하고 런을
  // RUNNING으로 바꿔 두었습니다. 그런데 바깥 catch는 화면에 문장만 돌려주고
  // 끝나서, 런은 RUNNING에 그대로 남고 `fail_quick_analysis`가 불리지
  // 않았습니다. 실패로 기록되지 않으니 자동 환불도, 실패 알림도 걸리지
  // 않습니다 — 모델 이름 하나가 틀리면 손님 돈만 들어오고 아무 일도 일어나지
  // 않는 상태가 됩니다. 실제로 그렇게 두 시간 멈춰 있던 런이 있었습니다.
  //
  // 10분 타임아웃 환불이 결국 잡아 주기는 하지만, 그건 크론이 돌아야 하고
  // 손님은 그동안 아무 말도 못 듣습니다.
  let repository: SupabaseQuickAnalysisRunRepository | null = null;
  let failableRunId: string | null = null;
  try {
    const body = bodySchema.parse(await request.json());
    failableRunId = body.analysisRunId;
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;
    if (!apiKey || !model) throw new Error("OPENAI_CONFIGURATION_MISSING");

    repository = new SupabaseQuickAnalysisRunRepository(data.user.id);
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
        await recordAnalysisAttempt({ analysisRunId: body.analysisRunId, ownerUserId: data.user.id, outcome: "PROVIDER_FAILED", failureCode: "AI_PROVIDER_FAILED", source: "BROWSER", usage: { responseId: background.responseId } });
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
        // 여기까지 온 응답은 모델이 끝까지 만들어 낸 것입니다. 버려지지만
        // 요금은 이미 나갔으므로, 토큰을 적어 두지 않으면 그 비용이 어디에도
        // 남지 않습니다.
        await recordAnalysisAttempt({ analysisRunId: body.analysisRunId, ownerUserId: data.user.id, outcome: "VALIDATION_FAILED", failureCode: "AI_OUTPUT_VALIDATION_FAILED", source: "BROWSER", usage: background.result.execution });
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
        await recordAnalysisAttempt({ analysisRunId: body.analysisRunId, ownerUserId: data.user.id, outcome: "QUESTION_MISSING", failureCode: "AI_OUTPUT_VALIDATION_FAILED", source: "BROWSER", usage: background.result.execution });
        return NextResponse.json({
          error: assemblyError.userMessage,
          detail: assemblyError.userMessage,
          code: "QUESTION_RESULT_MISSING",
        }, { status: 422 });
      }
      await repository.complete(body.analysisRunId, result);
      await recordAnalysisAttempt({ analysisRunId: body.analysisRunId, ownerUserId: data.user.id, outcome: "COMPLETED", source: "BROWSER", usage: background.result.execution });
    } catch (executionError) {
      if (!(executionError instanceof Error) || !executionError.message.startsWith("QUICK_ANALYSIS_RUNNING_CONTEXT_FAILED:")) throw executionError;
      const context = await repository.begin(body.analysisRunId);
      const responseId = await gateway.startBackground(context.request, context.attemptCount);
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

    // 실패로 적어 둡니다. 그래야 이용권이 돌아가고, 알림이 나가고, 최종
    // 실패라면 자동 환불이 걸립니다.
    //
    // 401·403·404는 우리 설정이 틀린 것이라 다시 눌러도 같은 답이 옵니다.
    // 그때는 재시도로 두지 않습니다 — 같은 실패를 두 번 더 사는 대신, 바로
    // 최종 실패로 보내 환불과 알림을 받는 편이 손님에게도 우리에게도 낫습니다.
    if (repository && failableRunId) {
      const retryable = !/^AI_PROVIDER_(401|403|404)$/.test(failure.code);
      try {
        await repository.fail(failableRunId, failure.code === "UNKNOWN" ? "ANALYSIS_FAILED" : failure.code, retryable);
      } catch (failError) {
        // 이미 실패로 적혀 있거나 상태가 맞지 않는 경우입니다. 원래 오류를
        // 이것으로 덮으면 진짜 이유가 사라집니다.
        console.error("quick_analysis_fail_record_failed", failError instanceof Error ? failError.message : "UNKNOWN_ERROR");
      }
    }

    return NextResponse.json({
      error: failure.message,
      code: failure.code,
      ...(process.env.NODE_ENV !== "production" ? { detail, diagnostic: detail } : {}),
    }, { status: 500 });
  }
}
