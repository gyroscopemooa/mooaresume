import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { socialEmailGuard } from "@/server/auth/social-email-guard";
import { createNicepayCheckout } from "@/server/billing/nicepay-checkout";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "허용되지 않은 출처입니다." }, { status: 403 });
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const emailGuard = socialEmailGuard(data.user, "/analysis/prepare");
  if (emailGuard) return emailGuard;
  try {
    const result = await createNicepayCheckout({ raw: await request.json(), userId: data.user.id, origin: request.nextUrl.origin,
      loadContext: async runId => client.rpc("prepare_quick_checkout", { p_analysis_run_id: runId }) });
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (caught) {
    if (caught instanceof ZodError || caught instanceof SyntaxError) return NextResponse.json({ error: "결제 요청을 확인해 주세요." }, { status: 400 });
    const code = caught instanceof Error ? caught.message : "NICEPAY_CHECKOUT_FAILED";
    const message = code === "CHECKOUT_PROVIDER_IN_PROGRESS" ? "이미 준비한 결제창이 있습니다. 같은 결제수단으로 이어서 진행해 주세요. 결제 승인 확인 중에는 추가 결제를 시작할 수 없습니다." : "결제창을 준비하지 못했습니다. 입력 내용은 저장되어 있습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({ error: message, code: ["CHECKOUT_PROVIDER_IN_PROGRESS", "NICEPAY_NOT_ENABLED"].includes(code) ? code : "NICEPAY_CHECKOUT_FAILED" }, { status: 409 });
  }
}
