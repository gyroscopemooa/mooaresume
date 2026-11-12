import { NextRequest, NextResponse } from "next/server";
import { SupabaseNicepayOrderRepository } from "@/server/billing/nicepay-order-repository";
import { getNicepayPaymentConfig, processNicepayAuthentication } from "@/server/billing/nicepay-payment-service";
import { NicepayGateway } from "@/server/billing/nicepay-protocol";
import { nicepayPurchaseHtml } from "@/server/billing/nicepay-checkout";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > 16_384) return nicepayPurchaseHtml("응답 크기가 올바르지 않습니다.", 413);
  const body = await request.text();
  if (body.length > 16_384) return nicepayPurchaseHtml("응답 크기가 올바르지 않습니다.", 413);
  const params = new URLSearchParams(body);
  if (params.get("AuthResultCode") !== "0000") return NextResponse.redirect(new URL("/analysis/prepare?checkout=cancelled", request.url), 303);
  for (const field of ["MID", "Moid", "Amt", "Signature", "AuthToken", "TxTid", "NextAppURL", "NetCancelURL", "PayMethod"]) {
    if (new Set(params.getAll(field)).size !== 1) return nicepayPurchaseHtml("결제 응답을 확인하지 못했습니다.", 400);
  }
  try {
    const outcome = await processNicepayAuthentication(Object.fromEntries(params), new SupabaseNicepayOrderRepository(), new NicepayGateway(getNicepayPaymentConfig()));
    const succeeded = ["PAID", "WAITING", "REVIEW_REQUIRED"].includes(outcome.disposition);
    const target = succeeded ? `/analysis/prepare?checkout=success&checkout_id=${outcome.order.id}` : "/analysis/prepare?checkout=cancelled";
    return NextResponse.redirect(new URL(target, request.url), 303);
  } catch {
    // Do not log callback bodies, authorization tokens, signatures or card fields.
    return nicepayPurchaseHtml('결제 응답을 안전하게 확인하지 못했습니다. 중복 결제하지 마시고 구매 내역에서 확인해 주세요. <a href="/app/my">내 이용 내역</a>', 400);
  }
}
