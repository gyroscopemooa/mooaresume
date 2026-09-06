import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CAREER_DESCRIPTION_BUILD_PRICE_KRW } from "@/domain/career-description-build";
import { getCheckoutReturnOrigin } from "@/server/billing/checkout-return-origin";
import { createCareerDescriptionBuildCheckout } from "@/server/billing/career-description-build-checkout";
import { attachCareerDescriptionBuildCheckout, createCareerDescriptionBuild, CareerDescriptionBuildStoreError } from "@/server/career-description/career-description-build-repository";

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

/**
 * AI 경력기술서 제작 1건을 사는 자리. 이력서 제작(`resume-builds/route.ts`)과
 * 같은 구조입니다 — 건을 만들고 결제 창까지 한 번에 만들고, 자료는 결제가
 * 끝난 뒤 실행 요청에만 실립니다.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const siteUrl = getCheckoutReturnOrigin(request.nextUrl);
  let buildId: string | null = null;
  try {
    const build = await createCareerDescriptionBuild(authData.user.id);
    buildId = build.id;
    const session = await createCareerDescriptionBuildCheckout({
      buildId: build.id,
      userId: authData.user.id,
      customerEmail: authData.user.email,
      successUrl: `${siteUrl}/career-description?career_description_build=${build.id}&checkout=success`,
      returnUrl: `${siteUrl}/career-description?career_description_build=${build.id}`,
    });
    await attachCareerDescriptionBuildCheckout({
      buildId: build.id,
      ownerUserId: authData.user.id,
      checkoutId: session.checkoutId,
      checkoutUrl: session.checkoutUrl,
    });
    return NextResponse.json({ buildId: build.id, checkoutUrl: session.checkoutUrl, priceKrw: CAREER_DESCRIPTION_BUILD_PRICE_KRW }, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const configMissing = /POLAR_|SUPABASE_SECRET_KEY|NEXT_PUBLIC_SUPABASE_URL/.test(detail);
    console.error("career_description_build_checkout_failed", JSON.stringify({ buildId, code: error instanceof CareerDescriptionBuildStoreError ? error.code : configMissing ? "CONFIG_MISSING" : "POLAR", detail: detail.slice(0, 300) }));
    return NextResponse.json({
      error: configMissing
        ? "결제 설정이 아직 준비되지 않았습니다. 아무것도 청구되지 않았습니다."
        : "결제 페이지를 만들지 못했습니다. 아무것도 청구되지 않았습니다.",
      code: configMissing ? "CONFIG_MISSING" : "CHECKOUT_FAILED",
    }, { status: 502 });
  }
}
