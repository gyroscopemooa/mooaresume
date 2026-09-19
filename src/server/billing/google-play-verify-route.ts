import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  classifyGooglePlayFailure,
  describeGooglePlayFailureMeta,
  createAndroidPublisherClientFromEnv,
  describeGooglePlayConfigShape,
} from "@/server/billing/google-play-checkout";
import { GooglePlayVerificationError, processGooglePlayPurchase } from "@/server/billing/google-play-verification";
import { SupabaseGooglePlayEntitlementRepository } from "@/server/billing/supabase-google-play-entitlement-repository";

/**
 * The Google Play counterpart of handleCheckoutRequest (checkout-route.ts).
 * Where that route creates a Polar checkout session, this one verifies a
 * purchase the client already completed inside the Play Store TWA — see
 * google-play-verification.ts for why the shapes differ.
 */
export async function handleGooglePlayVerifyRequest(request: NextRequest) {
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
    const { client, config } = createAndroidPublisherClientFromEnv();
    const result = await processGooglePlayPurchase({
      rawRequest: body,
      currentUserId: authData.user.id,
      loadRunCaseId: async (analysisRunId) => {
        // The caller's own client: RLS returns nothing for someone else's run.
        const { data } = await supabase
          .from("analysis_runs")
          .select("application_case_id")
          .eq("id", analysisRunId)
          .maybeSingle();
        return typeof data?.application_case_id === "string" ? data.application_case_id : null;
      },
      loadContext: async (analysisRunId) => {
        const { data, error } = await supabase.rpc("prepare_quick_checkout", {
          p_analysis_run_id: analysisRunId,
        });
        return {
          data,
          error: error ? { message: error.message, code: error.code } : null,
        };
      },
      expectedProductIds: config.productIds,
      fetchPurchase: async (productId, purchaseToken) => {
        const response = await client.purchases.products.get({
          packageName: config.packageName,
          productId,
          token: purchaseToken,
        });
        return {
          purchaseState: response.data.purchaseState ?? null,
          orderId: response.data.orderId ?? null,
          acknowledgementState: response.data.acknowledgementState ?? null,
          regionCode: response.data.regionCode ?? null,
        };
      },
      acknowledgePurchase: async (productId, purchaseToken) => {
        await client.purchases.products.acknowledge({
          packageName: config.packageName,
          productId,
          token: purchaseToken,
          requestBody: {},
        });
      },
      repository: new SupabaseGooglePlayEntitlementRepository(),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "구매 확인 요청 값이 올바르지 않습니다.",
        ...(process.env.NODE_ENV !== "production" ? { issues: error.issues } : {}),
      }, { status: 400 });
    }
    if (error instanceof GooglePlayVerificationError) {
      const status = error.code === "ANALYSIS_RUN_MISMATCH" || error.code === "GOOGLE_PLAY_PRODUCT_MISMATCH" || error.code === "GOOGLE_PLAY_PURCHASE_ALREADY_APPLIED" || error.code === "GOOGLE_PLAY_PENDING" ? 409 : 400;
      // `consumable` tells the app whether it may finish the Play purchase.
      return NextResponse.json({ error: error.message, code: error.code, consumable: error.consumable }, { status });
    }
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const code = classifyGooglePlayFailure(error);
    console.error("google_play_verify_failed", JSON.stringify({ code, meta: describeGooglePlayFailureMeta(error), error: detail.slice(0, 200), config: describeGooglePlayConfigShape() }));
    return NextResponse.json({
      error: "구매를 확인하지 못했습니다.",
      code,
      consumable: false,
      ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
    }, { status: 502 });
  }
}
