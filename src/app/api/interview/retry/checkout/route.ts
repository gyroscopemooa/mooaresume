import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCheckoutReturnOrigin } from "@/server/billing/checkout-return-origin";
import { createInterviewRetryCheckout } from "@/server/billing/interview-retry-checkout";

export const runtime = "nodejs";

/**
 * 웹 브라우저용 3,000원 모의면접 재시도 결제 — Polar 체크아웃을 만들어
 * 돌려준다. Play 앱 안에서는 이 라우트를 쓰지 않고 Google Play Billing을
 * 바로 쓴다(google-play/verify/route.ts).
 */

const bodySchema = z.object({ analysisRunId: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  // 본인 분석 건인지 RLS로 확인 — 없으면 남의 것이거나 존재하지 않는 것.
  const { data: runRow } = await supabase
    .from("analysis_runs")
    .select("id")
    .eq("id", parsed.data.analysisRunId)
    .maybeSingle();
  if (!runRow) return NextResponse.json({ error: "분석 결과를 찾지 못했습니다." }, { status: 404 });

  try {
    const siteUrl = getCheckoutReturnOrigin(new URL(request.url));
    const result = await createInterviewRetryCheckout({
      analysisRunId: parsed.data.analysisRunId,
      externalCustomerId: authData.user.id,
      customerEmail: authData.user.email,
      successUrl: `${siteUrl}/result?analysisRunId=${parsed.data.analysisRunId}&interviewRetryCheckout={CHECKOUT_ID}`,
      returnUrl: `${siteUrl}/result?analysisRunId=${parsed.data.analysisRunId}`,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("interview_retry_checkout_failed", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    return NextResponse.json({ error: "결제 페이지를 만들지 못했습니다." }, { status: 502 });
  }
}
