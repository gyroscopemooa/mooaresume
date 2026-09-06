import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { careerDescriptionBuildRequestSchema, hasEnoughCareerDescriptionBuildSource } from "@/domain/career-description-build";
import { checkCareerDescriptionBuildPayment } from "@/server/billing/career-description-build-checkout";
import { createCareerDescriptionBuildGatewayFromEnv } from "@/server/ai/career-description/career-description-build-gateway";
import {
  claimCareerDescriptionBuildRun, finishCareerDescriptionBuildRun, loadCareerDescriptionBuild, releaseCareerDescriptionBuildRun,
  MAX_CAREER_DESCRIPTION_BUILD_ATTEMPTS,
} from "@/server/career-description/career-description-build-repository";

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
 * 결제한 1건으로 경력기술서를 만듭니다. 이력서 제작의 실행 경로
 * (`resume-builds/[buildId]/execute/route.ts`)와 같은 순서입니다 — 결제를
 * Polar에 직접 확인하고, 실행 권한을 한 사람에게만 주고, 모델을 부릅니다.
 * 자료는 이 요청에만 실려 오고 저장하지 않습니다.
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
    parsed = careerDescriptionBuildRequestSchema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "보낸 자료의 형식이 올바르지 않습니다." }, { status: 400 });
    throw error;
  }
  if (!hasEnoughCareerDescriptionBuildSource(parsed)) {
    return NextResponse.json({ error: "정리할 자료가 너무 적습니다. 경력을 조금 더 적거나 파일을 올려 주세요.", code: "NOT_ENOUGH_SOURCE" }, { status: 400 });
  }

  const build = await loadCareerDescriptionBuild(buildId, authData.user.id);
  if (!build) return NextResponse.json({ error: "경력기술서 제작 건을 찾지 못했습니다.", code: "NOT_FOUND" }, { status: 404 });
  if (build.status === "USED") {
    return NextResponse.json({ error: "이미 사용한 건입니다. 다시 만들려면 새로 결제해 주세요.", code: "ALREADY_USED" }, { status: 409 });
  }
  if (build.status === "FAILED") {
    return NextResponse.json({ error: `${MAX_CAREER_DESCRIPTION_BUILD_ATTEMPTS}번 모두 실패했습니다. 결제 내역과 함께 문의해 주시면 환불해 드립니다.`, code: "RUN_FAILED" }, { status: 409 });
  }
  if (!build.provider_checkout_id) {
    return NextResponse.json({ error: "결제가 확인되지 않았습니다.", code: "PAYMENT_REQUIRED" }, { status: 402 });
  }

  const payment = await checkCareerDescriptionBuildPayment({
    checkoutId: build.provider_checkout_id,
    buildId: build.id,
    userId: authData.user.id,
  });
  if (!payment.paid) {
    return NextResponse.json({
      error: payment.reason === "NOT_PAID" ? "결제가 아직 확인되지 않았습니다. 결제를 마치면 이어서 만들어 드립니다." : "이 결제로는 경력기술서를 만들 수 없습니다.",
      code: payment.reason,
    }, { status: 402 });
  }

  const claimed = await claimCareerDescriptionBuildRun(build.id, authData.user.id);
  if (!claimed) {
    return NextResponse.json({ error: "이미 실행 중입니다. 잠시 후 다시 확인해 주세요.", code: "ALREADY_RUNNING" }, { status: 409 });
  }

  try {
    const result = await createCareerDescriptionBuildGatewayFromEnv().build(parsed);
    await finishCareerDescriptionBuildRun(build.id);
    return NextResponse.json({ output: result.output, truncated: result.truncated }, { status: 200 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    await releaseCareerDescriptionBuildRun(build.id, claimed.attempt_count);
    const remaining = MAX_CAREER_DESCRIPTION_BUILD_ATTEMPTS - (claimed.attempt_count + 1);
    console.error("career_description_build_run_failed", JSON.stringify({ buildId: build.id, attempt: claimed.attempt_count + 1, detail: detail.slice(0, 300) }));
    return NextResponse.json({
      error: remaining > 0
        ? "경력기술서를 만들지 못했습니다. 결제는 그대로 남아 있으니 잠시 후 다시 시도해 주세요."
        : "경력기술서를 만들지 못했습니다. 결제 내역과 함께 문의해 주시면 환불해 드립니다.",
      code: "RUN_FAILED",
    }, { status: 502 });
  }
}
