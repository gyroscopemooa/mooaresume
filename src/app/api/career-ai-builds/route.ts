import { createCareerNicepayCheckout } from "@/server/billing/career-nicepay";
import { nicepayPaymentRequestSchema } from "@/server/billing/nicepay-checkout";
import { nicepayAvailableFor } from "@/server/billing/nicepay-payment-service";
import { checkoutEmail } from "@/lib/auth/delivery-preference";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { socialEmailGuard } from "@/server/auth/social-email-guard";
import { CAREER_AI_COMBINED_PRICE_KRW, CAREER_AI_SINGLE_PRICE_KRW } from "@/domain/builder-pricing";
import { getCheckoutReturnOrigin } from "@/server/billing/checkout-return-origin";
import { createDocumentBuildCheckout } from "@/server/billing/document-build-checkout";
import { attachBuildCheckout, BuildStoreError, createBuild } from "@/server/document-builds/build-lifecycle";
import { getCareerAiBuildDefinition } from "@/server/document-builds/products";

export const runtime = "nodejs";

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host || new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

const bodySchema = z.object({ scope: z.enum(["interest", "work_style", "work_values", "combined"]), payment: nicepayPaymentRequestSchema.optional() }).strict();

/**
 * AI 심층해설 1건을 사는 자리.
 *
 * 검사 점수는 이미 서버가 갖고 있으므로(career_assessment_results) 여기서는
 * 아무 자료도 받지 않습니다 — 범위만 고르면 됩니다. 점수는 결제 확인 뒤
 * 실행(execute) 시점에 서버가 직접 읽습니다.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, { status: 401 });
  }
  const emailGuard = socialEmailGuard(authData.user, "/career/ai");
  if (emailGuard) return emailGuard;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "해설 범위를 다시 선택해 주세요." }, { status: 400 });

  const { scope, payment } = parsed.data;
  if (payment && !nicepayAvailableFor(authData.user.id)) return NextResponse.json({ error: "현재 계정에서는 NICE 결제를 이용할 수 없습니다." }, { status: 403 });
  const definition = getCareerAiBuildDefinition(scope);
  const priceKrw = scope === "combined" ? CAREER_AI_COMBINED_PRICE_KRW : CAREER_AI_SINGLE_PRICE_KRW;

  const siteUrl = getCheckoutReturnOrigin(request.nextUrl);
  let buildId: string | null = null;
  try {
    const build = await createBuild(definition.table, authData.user.id, priceKrw, { scope });
    buildId = build.id;
    const session = payment ? await createCareerNicepayCheckout(build.id, authData.user.id, { scope, payment }, siteUrl) : await createDocumentBuildCheckout(definition.product, {
      buildId: build.id,
      userId: authData.user.id,
      priceKrw,
      customerEmail: checkoutEmail(authData.user),
      successUrl: `${siteUrl}/career/ai?scope=${scope}&career_ai_build=${build.id}&checkout=success`,
      returnUrl: `${siteUrl}/career/ai?scope=${scope}&career_ai_build=${build.id}`,
    });
    await attachBuildCheckout(definition.table, {
      buildId: build.id,
      ownerUserId: authData.user.id,
      checkoutId: session.checkoutId,
      checkoutUrl: session.checkoutUrl,
    });
    return NextResponse.json({ buildId: build.id, checkoutUrl: session.checkoutUrl, priceKrw }, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const configMissing = /polar_|POLAR_|SUPABASE_SECRET_KEY|NEXT_PUBLIC_SUPABASE_URL/.test(detail);
    console.error("career_ai_build_checkout_failed", JSON.stringify({ buildId, scope, code: error instanceof BuildStoreError ? error.code : configMissing ? "CONFIG_MISSING" : "POLAR", detail: detail.slice(0, 300) }));
    return NextResponse.json({
      error: configMissing
        ? "결제 설정이 아직 준비되지 않았습니다. 아무것도 청구되지 않았습니다."
        : "결제 페이지를 만들지 못했습니다. 아무것도 청구되지 않았습니다.",
      code: configMissing ? "CONFIG_MISSING" : "CHECKOUT_FAILED",
    }, { status: 502 });
  }
}
