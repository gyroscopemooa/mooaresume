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
      return NextResponse.json({ error: "상품 정보가 일치하지 않습니다.", code: "GOOGLE_PLAY_PRODUCT_MISMATCH", consumable: false }, { status: 409 });
    }

    const purchase = await client.purchases.products.get({
      packageName: config.packageName,
      productId: parsed.data.productId,
      token: parsed.data.purchaseToken,
    });
    // 승인 대기(무통장·편의점 등)는 실패가 아니라 "아직"입니다. 승인하지도
    // 소비하지도 않고, 앱이 토큰을 들고 나중에 다시 물어봅니다.
    if (purchase.data.purchaseState === 2) {
      return NextResponse.json({
        error: "결제 승인을 기다리는 중입니다. 승인이 끝나면 다시 시도해 주세요. 추가 결제는 되지 않습니다.",
        code: "GOOGLE_PLAY_PENDING",
        consumable: false,
      }, { status: 409 });
    }
    if (purchase.data.purchaseState !== 0) {
      return NextResponse.json({ error: "결제가 완료되지 않았습니다.", code: "GOOGLE_PLAY_NOT_PURCHASED", consumable: false }, { status: 400 });
    }
    // 원장이 KRW 기준입니다(INTERVIEW_RETRY_PRICE_KRW). 다른 스토어 결제는
    // 승인 전에 거절해 Play가 자동 환불하게 둡니다.
    if (purchase.data.regionCode !== "KR") {
      return NextResponse.json({
        error: "현재 한국 Google Play 계정의 결제만 지원합니다. 확인되지 않은 결제는 Google Play가 자동으로 환불합니다.",
        code: "GOOGLE_PLAY_REGION_UNSUPPORTED",
        consumable: false,
      }, { status: 400 });
    }
    if (purchase.data.acknowledgementState === 0) {
      await client.purchases.products.acknowledge({
        packageName: config.packageName,
        productId: parsed.data.productId,
        token: parsed.data.purchaseToken,
        requestBody: {},
      });
    }

    const providerOrderId = purchase.data.orderId ?? parsed.data.purchaseToken;
    const client2 = serviceClient();
    if (!client2) return NextResponse.json({ error: "지금은 결제를 확정할 수 없습니다.", consumable: false }, { status: 503 });

    const { data, error } = await client2.rpc("grant_interview_retry", {
      p_analysis_run_id: parsed.data.analysisRunId,
      p_provider: "GOOGLE_PLAY",
      p_provider_order_id: providerOrderId,
      // Play Developer API의 구매 조회 응답엔 실제 청구액이 없다 — Play
      // Console에 등록한 카탈로그 기준가를 그대로 기록한다(google-play-verification.ts와
      // 같은 한계, 같은 이유).
      p_amount: INTERVIEW_RETRY_PRICE_KRW,
      p_currency: "krw",
      p_paid_at: new Date().toISOString(),
    });
    if (error) {
      return NextResponse.json({ error: "결제를 반영하지 못했습니다.", code: error.code, consumable: false }, { status: 502 });
    }

    const outcome = data as string;
    if (outcome === "DUPLICATE_ORDER") {
      // 같은 구매를 두 번 보낸 경우(재시도·복구)와, 한 구매를 다른 분석 건에
      // 쓰려는 경우를 가릅니다. 앞은 정상이고, 뒤는 거절해야 합니다.
      const { data: existing } = await client2
        .from("interview_retry_orders")
        .select("analysis_run_id")
        .eq("provider", "GOOGLE_PLAY")
        .eq("provider_order_id", providerOrderId)
        .maybeSingle();
      if (existing && existing.analysis_run_id !== parsed.data.analysisRunId) {
        return NextResponse.json({
          error: "이 결제는 이미 다른 분석 건의 재시도에 사용되었습니다.",
          code: "GOOGLE_PLAY_PURCHASE_ALREADY_APPLIED",
          // 이용권은 이미 지급됐으므로 앱은 이 구매를 끝내도 됩니다.
          consumable: true,
        }, { status: 409 });
      }
    }

    // `consumable`이 있어야 앱이 구매를 소비합니다. 소비하지 않으면 Play가
    // 다음 재시도 구매를 "이미 보유한 항목"으로 막습니다.
    return NextResponse.json({ paid: true, outcome, consumable: true });
  } catch (error) {
    console.error("interview_retry_google_play_verify_failed", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    return NextResponse.json({ error: "구매를 확인하지 못했습니다." }, { status: 502 });
  }
}
