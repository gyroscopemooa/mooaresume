import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PORTFOLIO_BUILD_PRICE_KRW } from "@/domain/portfolio-build";
import { getCheckoutReturnOrigin } from "@/server/billing/checkout-return-origin";
import { createDocumentBuildCheckout } from "@/server/billing/document-build-checkout";
import { attachBuildCheckout, BuildStoreError, createBuild } from "@/server/document-builds/build-lifecycle";
import { portfolioBuild } from "@/server/document-builds/products";

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

/** AI 포트폴리오 설명글 1건을 사는 자리. 자료는 결제가 끝난 뒤 실행 요청에만 실립니다. */
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
    const build = await createBuild(portfolioBuild.table, authData.user.id, PORTFOLIO_BUILD_PRICE_KRW);
    buildId = build.id;
    const session = await createDocumentBuildCheckout(portfolioBuild.product, {
      buildId: build.id,
      userId: authData.user.id,
      priceKrw: PORTFOLIO_BUILD_PRICE_KRW,
      customerEmail: authData.user.email,
      successUrl: `${siteUrl}/portfolio?portfolio_build=${build.id}&checkout=success`,
      returnUrl: `${siteUrl}/portfolio?portfolio_build=${build.id}`,
    });
    await attachBuildCheckout(portfolioBuild.table, {
      buildId: build.id,
      ownerUserId: authData.user.id,
      checkoutId: session.checkoutId,
      checkoutUrl: session.checkoutUrl,
    });
    return NextResponse.json({ buildId: build.id, checkoutUrl: session.checkoutUrl, priceKrw: PORTFOLIO_BUILD_PRICE_KRW }, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const configMissing = /POLAR_|SUPABASE_SECRET_KEY|NEXT_PUBLIC_SUPABASE_URL/.test(detail);
    console.error("portfolio_build_checkout_failed", JSON.stringify({ buildId, code: error instanceof BuildStoreError ? error.code : configMissing ? "CONFIG_MISSING" : "POLAR", detail: detail.slice(0, 300) }));
    return NextResponse.json({
      error: configMissing
        ? "결제 설정이 아직 준비되지 않았습니다. 아무것도 청구되지 않았습니다."
        : "결제 페이지를 만들지 못했습니다. 아무것도 청구되지 않았습니다.",
      code: configMissing ? "CONFIG_MISSING" : "CHECKOUT_FAILED",
    }, { status: 502 });
  }
}
