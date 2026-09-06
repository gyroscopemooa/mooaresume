import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasEnoughPortfolioBuildSource, portfolioBuildRequestSchema } from "@/domain/portfolio-build";
import { checkDocumentBuildPayment } from "@/server/billing/document-build-checkout";
import { createPortfolioBuildGatewayFromEnv } from "@/server/ai/portfolio/portfolio-build-gateway";
import { claimBuildRun, finishBuildRun, loadBuild, releaseBuildRun, MAX_BUILD_ATTEMPTS } from "@/server/document-builds/build-lifecycle";
import { portfolioBuild } from "@/server/document-builds/products";

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
 * 결제한 1건으로 포트폴리오 설명글을 만듭니다. 순서는 다른 제작 기능과
 * 같습니다 — 결제 확인 → 실행 권한 확보 → 모델 호출, 실패하면 권한 반환.
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
    parsed = portfolioBuildRequestSchema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "보낸 자료의 형식이 올바르지 않습니다." }, { status: 400 });
    throw error;
  }
  if (!hasEnoughPortfolioBuildSource(parsed)) {
    return NextResponse.json({ error: "설명할 내용이 너무 적습니다. 프로젝트를 조금 더 적거나 파일을 올려 주세요.", code: "NOT_ENOUGH_SOURCE" }, { status: 400 });
  }

  const build = await loadBuild(portfolioBuild.table, buildId, authData.user.id);
  if (!build) return NextResponse.json({ error: "포트폴리오 제작 건을 찾지 못했습니다.", code: "NOT_FOUND" }, { status: 404 });
  if (build.status === "USED") {
    return NextResponse.json({ error: "이미 사용한 건입니다. 다시 만들려면 새로 결제해 주세요.", code: "ALREADY_USED" }, { status: 409 });
  }
  if (build.status === "FAILED") {
    return NextResponse.json({ error: `${MAX_BUILD_ATTEMPTS}번 모두 실패했습니다. 결제 내역과 함께 문의해 주시면 환불해 드립니다.`, code: "RUN_FAILED" }, { status: 409 });
  }
  if (!build.provider_checkout_id) {
    return NextResponse.json({ error: "결제가 확인되지 않았습니다.", code: "PAYMENT_REQUIRED" }, { status: 402 });
  }

  const payment = await checkDocumentBuildPayment(portfolioBuild.product, {
    checkoutId: build.provider_checkout_id,
    buildId: build.id,
    userId: authData.user.id,
  });
  if (!payment.paid) {
    return NextResponse.json({
      error: payment.reason === "NOT_PAID" ? "결제가 아직 확인되지 않았습니다. 결제를 마치면 이어서 만들어 드립니다." : "이 결제로는 포트폴리오를 만들 수 없습니다.",
      code: payment.reason,
    }, { status: 402 });
  }

  const claimed = await claimBuildRun(portfolioBuild.table, build.id, authData.user.id);
  if (!claimed) {
    return NextResponse.json({ error: "이미 실행 중입니다. 잠시 후 다시 확인해 주세요.", code: "ALREADY_RUNNING" }, { status: 409 });
  }

  try {
    const result = await createPortfolioBuildGatewayFromEnv().build(parsed);
    await finishBuildRun(portfolioBuild.table, build.id);
    return NextResponse.json({ output: result.output, truncated: result.truncated }, { status: 200 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    await releaseBuildRun(portfolioBuild.table, build.id, claimed.attempt_count);
    const remaining = MAX_BUILD_ATTEMPTS - (claimed.attempt_count + 1);
    console.error("portfolio_build_run_failed", JSON.stringify({ buildId: build.id, attempt: claimed.attempt_count + 1, detail: detail.slice(0, 300) }));
    return NextResponse.json({
      error: remaining > 0
        ? "포트폴리오 설명글을 만들지 못했습니다. 결제는 그대로 남아 있으니 잠시 후 다시 시도해 주세요."
        : "포트폴리오 설명글을 만들지 못했습니다. 결제 내역과 함께 문의해 주시면 환불해 드립니다.",
      code: "RUN_FAILED",
    }, { status: 502 });
  }
}
