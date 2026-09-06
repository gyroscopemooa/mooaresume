import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RESUME_BUILD_PRICE_KRW } from "@/domain/resume-build";
import { getCheckoutReturnOrigin } from "@/server/billing/checkout-return-origin";
import { createResumeBuildCheckout } from "@/server/billing/resume-build-checkout";
import { attachResumeBuildCheckout, createResumeBuild, ResumeBuildStoreError } from "@/server/resume/resume-build-repository";

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
 * AI 이력서 제작 1건을 사는 자리.
 *
 * 건을 만들고 결제 창까지 한 번에 만듭니다. 나눠 두면 결제 없이 만들어진 건이
 * 쌓이기만 하고, 화면 쪽은 두 번 기다립니다.
 *
 * **자료는 여기로 보내지 않습니다.** 결제하기 전에 이력서 원본을 서버에 올릴
 * 이유가 없고, 무료 메이커가 한 "서버로 보내지 않습니다"라는 약속과도 어긋납니다.
 * 자료는 결제가 끝난 뒤 실행 요청에만 실립니다.
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
    const build = await createResumeBuild(authData.user.id);
    buildId = build.id;
    const session = await createResumeBuildCheckout({
      buildId: build.id,
      userId: authData.user.id,
      customerEmail: authData.user.email,
      successUrl: `${siteUrl}/resume?resume_build=${build.id}&checkout=success`,
      returnUrl: `${siteUrl}/resume?resume_build=${build.id}`,
    });
    await attachResumeBuildCheckout({
      buildId: build.id,
      ownerUserId: authData.user.id,
      checkoutId: session.checkoutId,
      checkoutUrl: session.checkoutUrl,
    });
    return NextResponse.json({ buildId: build.id, checkoutUrl: session.checkoutUrl, priceKrw: RESUME_BUILD_PRICE_KRW }, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    // 설정이 빠진 것과 결제사 오류는 다음에 할 일이 다릅니다. 앞의 것은
    // 운영자만 고칠 수 있고, 다시 눌러도 영원히 같습니다.
    const configMissing = /POLAR_|SUPABASE_SECRET_KEY|NEXT_PUBLIC_SUPABASE_URL/.test(detail);
    console.error("resume_build_checkout_failed", JSON.stringify({ buildId, code: error instanceof ResumeBuildStoreError ? error.code : configMissing ? "CONFIG_MISSING" : "POLAR", detail: detail.slice(0, 300) }));
    return NextResponse.json({
      error: configMissing
        ? "결제 설정이 아직 준비되지 않았습니다. 아무것도 청구되지 않았습니다."
        : "결제 페이지를 만들지 못했습니다. 아무것도 청구되지 않았습니다.",
      code: configMissing ? "CONFIG_MISSING" : "CHECKOUT_FAILED",
    }, { status: 502 });
  }
}
