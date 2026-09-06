import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasEnoughResumeBuildSource, resumeBuildRequestSchema } from "@/domain/resume-build";
import { checkResumeBuildPayment } from "@/server/billing/resume-build-checkout";
import { createResumeBuildGatewayFromEnv } from "@/server/ai/resume/resume-build-gateway";
import {
  claimResumeBuildRun, finishResumeBuildRun, loadResumeBuild, releaseResumeBuildRun,
  MAX_RESUME_BUILD_ATTEMPTS,
} from "@/server/resume/resume-build-repository";

export const runtime = "nodejs";
export const maxDuration = 300;

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host || new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * 결제한 1건으로 이력서 칸을 채웁니다.
 *
 * 자료는 이 요청에만 실려 옵니다 — 저장하지 않고, 응답을 만들면 사라집니다.
 * 서버에 남는 것은 "이 건을 썼다"는 표시뿐입니다.
 *
 * 순서가 중요합니다. ① 결제를 Polar에 직접 확인하고 ② 우리 표에서 실행 권한을
 * 한 사람에게만 주고(RUNNING) ③ 모델을 부릅니다. 모델이 실패하면 권한을
 * 돌려줍니다 — 결제한 사람이 모델 오류 한 번에 빈손이 되면 안 됩니다.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ buildId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });

  const { buildId } = await context.params;
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
  }

  let parsed;
  try {
    parsed = resumeBuildRequestSchema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "보낸 자료의 형식이 올바르지 않습니다." }, { status: 400 });
    throw error;
  }
  if (!hasEnoughResumeBuildSource(parsed)) {
    return NextResponse.json({ error: "옮겨 적을 자료가 너무 적습니다. 이력을 조금 더 적거나 파일을 올려 주세요.", code: "NOT_ENOUGH_SOURCE" }, { status: 400 });
  }

  const build = await loadResumeBuild(buildId, authData.user.id);
  if (!build) return NextResponse.json({ error: "이력서 제작 건을 찾지 못했습니다.", code: "NOT_FOUND" }, { status: 404 });
  if (build.status === "USED") {
    return NextResponse.json({ error: "이미 사용한 건입니다. 다시 만들려면 새로 결제해 주세요.", code: "ALREADY_USED" }, { status: 409 });
  }
  if (build.status === "FAILED") {
    return NextResponse.json({ error: `${MAX_RESUME_BUILD_ATTEMPTS}번 모두 실패했습니다. 결제 내역과 함께 문의해 주시면 환불해 드립니다.`, code: "RUN_FAILED" }, { status: 409 });
  }
  if (!build.provider_checkout_id) {
    return NextResponse.json({ error: "결제가 확인되지 않았습니다.", code: "PAYMENT_REQUIRED" }, { status: 402 });
  }

  const payment = await checkResumeBuildPayment({
    checkoutId: build.provider_checkout_id,
    buildId: build.id,
    userId: authData.user.id,
  });
  if (!payment.paid) {
    // 결제창을 닫고 돌아온 경우가 대부분입니다. 실패가 아니라 "아직"이라고 말합니다.
    return NextResponse.json({
      error: payment.reason === "NOT_PAID" ? "결제가 아직 확인되지 않았습니다. 결제를 마치면 이어서 만들어 드립니다." : "이 결제로는 이력서를 만들 수 없습니다.",
      code: payment.reason,
    }, { status: 402 });
  }

  const claimed = await claimResumeBuildRun(build.id, authData.user.id);
  if (!claimed) {
    return NextResponse.json({ error: "이미 실행 중입니다. 잠시 후 다시 확인해 주세요.", code: "ALREADY_RUNNING" }, { status: 409 });
  }

  try {
    const result = await createResumeBuildGatewayFromEnv().build(parsed);
    await finishResumeBuildRun(build.id);
    return NextResponse.json({ output: result.output, truncated: result.truncated }, { status: 200 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    await releaseResumeBuildRun(build.id, claimed.attempt_count);
    const remaining = MAX_RESUME_BUILD_ATTEMPTS - (claimed.attempt_count + 1);
    console.error("resume_build_run_failed", JSON.stringify({ buildId: build.id, attempt: claimed.attempt_count + 1, detail: detail.slice(0, 300) }));
    return NextResponse.json({
      error: remaining > 0
        ? "이력서를 만들지 못했습니다. 결제는 그대로 남아 있으니 잠시 후 다시 시도해 주세요."
        : "이력서를 만들지 못했습니다. 결제 내역과 함께 문의해 주시면 환불해 드립니다.",
      code: "RUN_FAILED",
    }, { status: 502 });
  }
}
