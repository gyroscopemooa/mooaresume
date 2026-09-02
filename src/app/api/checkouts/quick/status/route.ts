import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canRetryAnalysis } from "@/domain/analysis-retry";
import { createClient } from "@/lib/supabase/server";
import { refundTimedOutQuickAnalysis } from "@/server/billing/quick-timeout-refund";
import { createPolarCheckoutReconciliationRuntime, reconcilePolarCheckout } from "@/server/billing/polar-checkout-reconciliation";
import { SupabasePolarEntitlementRepository } from "@/server/billing/supabase-polar-entitlement-repository";

const querySchema = z.object({
  checkoutId: z.string().uuid(),
  reconcile: z.boolean(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    checkoutId: request.nextUrl.searchParams.get("checkoutId"),
    reconcile: request.nextUrl.searchParams.get("reconcile") === "1",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "결제 식별자가 올바르지 않습니다." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_quick_checkout_return", {
    p_provider_checkout_id: parsed.data.checkoutId,
  });
  if (error) {
    const status = error.code === "P0002" ? 404 : 500;
    return NextResponse.json({
      error: status === 404 ? "결제 정보를 찾지 못했습니다." : "결제 상태를 확인하지 못했습니다.",
      code: error.code,
    }, { status });
  }

  const checkoutSchema = z.object({
    checkoutStatus: z.enum(["OPEN", "SUCCEEDED", "EXPIRED"]),
    analysisRunId: z.string().uuid(),
    analysisStatus: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]),
    product: z.enum(["QUICK", "PRO", "FINAL"]),
    entitlementStatus: z.enum(["ACTIVE", "CONSUMED", "REVOKED"]).nullable(),
  }).passthrough();
  let checkout = checkoutSchema.parse(data);
  const { data: runDiagnostic } = await supabase.from("analysis_runs").select("failure_code, attempt_count, application_case_id, product").eq("id", checkout.analysisRunId).single();

  if (
    parsed.data.reconcile
    && checkout.checkoutStatus === "OPEN"
    && checkout.analysisStatus === "PENDING"
    && checkout.entitlementStatus === null
    && runDiagnostic?.application_case_id
    && runDiagnostic.product === checkout.product
  ) {
    try {
      const runtime = createPolarCheckoutReconciliationRuntime();
      const reconciliation = await reconcilePolarCheckout({
        checkoutId: parsed.data.checkoutId,
        ownerUserId: authData.user.id,
        applicationCaseId: runDiagnostic.application_case_id,
        product: checkout.product,
        expectedProductIds: runtime.expectedProductIds,
        environment: runtime.environment,
        gateway: runtime.gateway,
        repository: new SupabasePolarEntitlementRepository(),
      });
      if (reconciliation.disposition === "RECOVERED") {
        const refreshed = await supabase.rpc("get_quick_checkout_return", {
          p_provider_checkout_id: parsed.data.checkoutId,
        });
        if (!refreshed.error) checkout = checkoutSchema.parse(refreshed.data);
      }
    } catch (reconciliationError) {
      console.error("polar_checkout_reconciliation_failed", {
        error: reconciliationError instanceof Error ? reconciliationError.message : "UNKNOWN_ERROR",
      });
    }
  }

  // prepare_quick_analysis_retry refuses anything but a validation failure with
  // attempts left, so offering the button on every FAILED run promised a retry
  // the database would reject — and the rejection surfaced as a 500. These
  // three conditions mirror the function's own preconditions.
  const retryAvailable = canRetryAnalysis({
    analysisStatus: checkout.analysisStatus,
    entitlementStatus: checkout.entitlementStatus,
    failureCode: runDiagnostic?.failure_code ?? null,
    attemptCount: runDiagnostic?.attempt_count ?? null,
  });
  if (checkout.analysisStatus === "RUNNING") {
    try {
      const timeout = await refundTimedOutQuickAnalysis({ analysisRunId: checkout.analysisRunId, ownerUserId: authData.user.id });
      if (timeout.disposition === "REFUND_SUBMITTED") return NextResponse.json({ ...data, analysisStatus: "FAILED", timeoutRefunded: true });
    } catch (timeoutError) {
      console.error("quick_timeout_refund_failed", { error: timeoutError instanceof Error ? timeoutError.message : "UNKNOWN_ERROR" });
    }
  }
  // 광고 전환에 실제로 받은 금액을 실어 보내기 위한 값입니다. 상품 정가로
  // 대신하면 초과 과금이 붙은 결제가 정가로 보고되어, 구글이 배우는 매출이
  // 실제와 어긋납니다. 주문 번호는 전환 중복 제거의 열쇠이기도 합니다.
  // 읽지 못하면 그냥 비워 둡니다 — 이 조회 하나 때문에 결제 완료 화면이
  // 멈추는 편이 훨씬 나쁩니다.
  const { data: order } = await supabase
    .from("billing_orders")
    .select("provider_order_id, amount, currency, status")
    .eq("provider_checkout_id", parsed.data.checkoutId)
    .maybeSingle();
  const paid = order?.status === "PAID";

  return NextResponse.json({
    ...checkout,
    retryAvailable,
    failureCode: runDiagnostic?.failure_code ?? null,
    attemptCount: runDiagnostic?.attempt_count ?? null,
    orderId: paid ? (order?.provider_order_id as string | null) ?? null : null,
    amount: paid ? (order?.amount as number | null) ?? null : null,
    currency: paid ? (order?.currency as string | null) ?? null : null,
  });
}
