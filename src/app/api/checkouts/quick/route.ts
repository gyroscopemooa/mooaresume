import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { createPolarCheckoutGatewayFromEnv } from "@/server/billing/polar-checkout";
import { createQuickCheckout, QuickCheckoutError } from "@/server/billing/quick-checkout-service";

export const runtime = "nodejs";

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

function getCheckoutSiteUrl(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return request.nextUrl.origin;
  return getSiteUrl();
}

function getCustomerIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded && isIP(forwarded)) return forwarded;
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp && isIP(realIp) ? realIp : undefined;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
  }

  try {
    const siteUrl = getCheckoutSiteUrl(request);
    const result = await createQuickCheckout({
      rawRequest: body,
      loadContext: async (analysisRunId) => {
        const { data, error } = await supabase.rpc("prepare_quick_checkout", {
          p_analysis_run_id: analysisRunId,
        });
        return {
          data,
          error: error ? { message: error.message, code: error.code } : null,
        };
      },
      gateway: createPolarCheckoutGatewayFromEnv(),
      registerSession: async (analysisRunId, session) => {
        const { data, error } = await supabase.rpc("register_quick_checkout", {
          p_analysis_run_id: analysisRunId,
          p_provider_checkout_id: session.checkoutId,
          p_checkout_url: session.checkoutUrl,
          p_expires_at: session.expiresAt,
        });
        return {
          data,
          error: error ? { message: error.message, code: error.code } : null,
        };
      },
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      successUrl: `${siteUrl}/analysis/prepare?checkout=success&checkout_id={CHECKOUT_ID}`,
      returnUrl: `${siteUrl}/analysis/prepare`,
      customerIpAddress: getCustomerIp(request),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "결제 요청 값이 올바르지 않습니다.",
        ...(process.env.NODE_ENV !== "production" ? { issues: error.issues } : {}),
      }, { status: 400 });
    }
    if (error instanceof QuickCheckoutError) {
      const status = error.code === "P0002" ? 404 : error.code === "55000" ? 409 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    console.error("polar_checkout_failed", {
      error: detail,
      server: process.env.POLAR_SERVER ?? "sandbox",
      hasProductId: Boolean(process.env.POLAR_QUICK_PRODUCT_ID),
    });
    return NextResponse.json({
      error: "결제 페이지를 만들지 못했습니다.",
      ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
    }, { status: 502 });
  }
}
