import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { createAndroidPublisherClientForInterviewRetry } from "@/server/billing/google-play-checkout";
import { INTERVIEW_RETRY_PRICE_KRW } from "@/server/billing/interview-retry-checkout";

export const runtime = "nodejs";

/**
 * Play 앱 안에서 모의면접 재시도 1회를 구매했을 때 서버 검증 + 크레딧 지급.
 * 흐름은 `/api/billing/google-play/verify`(QUICK/PRO/FINAL)와 같은 생각이지만,
 * 그 라우트는 분석 실행(analysis_runs)의 사다리 가격에 묶여 있어 재사용하지
 * 않고 이 상품 전용으로 따로 둔다.
 */

const bodySchema = z.object({
  analysisRunId: z.string().uuid(),
  purchaseToken: z.string().min(1),
  productId: z.string().min(1),
});

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
  const supabase = await createUserClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const { data: runRow } = await supabase
    .from("analysis_runs")
    .select("id")
    .eq("id", parsed.data.analysisRunId)
    .maybeSingle();
  if (!runRow) return NextResponse.json({ error: "분석 결과를 찾지 못했습니다." }, { status: 404 });

  try {
    const { client, config } = createAndroidPublisherClientForInterviewRetry();
    if (parsed.data.productId !== config.productId) {
      return NextResponse.json({ error: "상품 정보가 일치하지 않습니다." }, { status: 409 });
    }

    const purchase = await client.purchases.products.get({
      packageName: config.packageName,
      productId: parsed.data.productId,
      token: parsed.data.purchaseToken,
    });
    if (purchase.data.purchaseState !== 0) {
      return NextResponse.json({ error: "결제가 완료되지 않았습니다." }, { status: 400 });
    }
    if (purchase.data.acknowledgementState === 0) {
      await client.purchases.products.acknowledge({
        packageName: config.packageName,
        productId: parsed.data.productId,
        token: parsed.data.purchaseToken,
        requestBody: {},
      });
    }

    const client2 = serviceClient();
    if (!client2) return NextResponse.json({ error: "지금은 결제를 확정할 수 없습니다." }, { status: 503 });

    const { data, error } = await client2.rpc("grant_interview_retry", {
      p_analysis_run_id: parsed.data.analysisRunId,
      p_provider: "GOOGLE_PLAY",
      p_provider_order_id: purchase.data.orderId ?? parsed.data.purchaseToken,
      // Play Developer API의 구매 조회 응답엔 실제 청구액이 없다 — Play
      // Console에 등록한 카탈로그 기준가를 그대로 기록한다(google-play-verification.ts와
      // 같은 한계, 같은 이유).
      p_amount: INTERVIEW_RETRY_PRICE_KRW,
      p_currency: "krw",
      p_paid_at: new Date().toISOString(),
    });
    if (error) {
      return NextResponse.json({ error: "결제를 반영하지 못했습니다.", code: error.code }, { status: 502 });
    }

    return NextResponse.json({ paid: true, outcome: data as string });
  } catch (error) {
    console.error("interview_retry_google_play_verify_failed", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    return NextResponse.json({ error: "구매를 확인하지 못했습니다." }, { status: 502 });
  }
}
