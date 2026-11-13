import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createCheckoutQuote } from "@/domain/usage-entitlement";
import { nicepayBrandSchema, nicepayBrandNames, nicepayConsentSchema, type NicepayConsent, type NicepayBrand } from "@/domain/nicepay-method";
import { escapeNicepayHtml, nicepayReviewHtml } from "./nicepay-review";
import { nicepayDigest, nicepayTimestamp } from "./nicepay-protocol";
import { getNicepayPaymentConfig, nicepayAvailableFor } from "./nicepay-payment-service";
import { SupabaseNicepayOrderRepository, type NicepayOrder } from "./nicepay-order-repository";
import { renderNicepayDirectWindow } from "./nicepay-direct-window";
import { signNicepayConsent } from "./nicepay-consent";

export const nicepayCheckoutRequestSchema = z.object({ analysisRunId: z.string().uuid(), method: z.enum(["CARD", "EASYPAY"]), preferredPay: nicepayBrandSchema.optional(), consent: nicepayConsentSchema.optional() }).strict()
  .refine(value => value.method === "EASYPAY" || !value.preferredPay)
  .refine(value => !value.preferredPay || !!value.consent, "NICEPAY_CONSENT_REQUIRED")
  .refine(value => value.preferredPay !== "NAVER" || !!value.consent?.naverMethod, "NICEPAY_NAVER_METHOD_REQUIRED");
const contextSchema = z.object({ analysisRunId: z.string().uuid(), applicationCaseId: z.string().uuid(),
  product: z.enum(["QUICK", "PRO", "FINAL"]), totalCharacters: z.number().int().positive() });

export function currentSourcePricingVersion(): string {
  const catalog = (["QUICK", "PRO", "FINAL"] as const).map(product => createCheckoutQuote(product, 1));
  return `source-v1-${nicepayDigest(JSON.stringify(catalog)).slice(0, 32)}`;
}
export async function createNicepayCheckout(input: {
  raw: unknown; userId: string; origin: string;
  loadContext: (runId: string) => Promise<{ data: unknown; error: { message: string } | null }>;
  repository?: SupabaseNicepayOrderRepository;
}) {
  if (!nicepayAvailableFor(input.userId)) throw new Error("NICEPAY_NOT_ENABLED");
  const request = nicepayCheckoutRequestSchema.parse(input.raw);
  const loaded = await input.loadContext(request.analysisRunId);
  if (loaded.error) throw new Error("NICEPAY_APPLICATION_NOT_PAYABLE");
  const context = contextSchema.parse(loaded.data);
  if (context.analysisRunId !== request.analysisRunId) throw new Error("NICEPAY_RUN_MISMATCH");
  const repo = input.repository ?? new SupabaseNicepayOrderRepository();
  await repo.reserve(context.analysisRunId, input.userId, "NICEPAY");
  const config = getNicepayPaymentConfig();
  const order = await repo.create({ id: randomUUID(), runId: context.analysisRunId, ownerId: input.userId,
    mid: config.mid, method: request.method, quote: createCheckoutQuote(context.product, context.totalCharacters),
    pricingVersion: currentSourcePricingVersion(), test: process.env.NICEPAY_PUBLIC_ENABLED !== "true" });
  const receipt = request.preferredPay && request.consent ? signNicepayConsent(order, request.preferredPay, request.consent) : undefined;
  return { checkoutId: order.id, checkoutUrl: `${new URL(input.origin).origin}/api/checkouts/nicepay/window?id=${order.id}${request.preferredPay ? `&pay=${request.preferredPay}` : ""}${receipt ? `&consent=${encodeURIComponent(receipt)}` : ""}`,
    expiresAt: order.expires_at, quote: order.quote_snapshot, pricingVersion: order.pricing_version };
}

export function renderNicepayPurchaseWindow(order: NicepayOrder, origin: string, preferredPay?: NicepayBrand, consent?: NicepayConsent): string {
  if (preferredPay && order.method !== "CARD") {
    return renderNicepayDirectWindow(order, origin, preferredPay, consent);
  }
  return renderNicepayCommonPurchaseWindow(order, origin, preferredPay);
}

/** Preserved common-selector variant for card purchases and focused rollback. */
export function renderNicepayCommonPurchaseWindow(order: NicepayOrder, origin: string, preferredPay?: NicepayBrand): string {
  const config = getNicepayPaymentConfig();
  if (order.merchant_mid !== config.mid || order.status !== "OPEN" || new Date(order.expires_at).getTime() <= Date.now()) {
    throw new Error("NICEPAY_WINDOW_NOT_OPEN");
  }
  const EdiDate = nicepayTimestamp();
  const fields = { MID: order.merchant_mid, Moid: order.moid, Amt: String(order.amount), GoodsName: `MOOA ${order.product}`,
    PayMethod: "CARD", EdiDate, CharSet: "utf-8", ReturnURL: `${new URL(origin).origin}/api/checkouts/nicepay/return`,
    SignData: nicepayDigest(EdiDate + order.merchant_mid + order.amount + config.merchantKey) };
  const hidden = Object.entries(fields).map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeNicepayHtml(value)}">`).join("");
  const paymentName = preferredPay ? nicepayBrandNames[preferredPay] : "카드·간편결제";
  // Keep the provider's own agreement screen. Direct Kakao remains a separate
  // administrator check until merchant-side direct-payment terms are approved.
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MOOA 결제</title><body style="font-family:sans-serif;max-width:640px;margin:40px auto;padding:20px;line-height:1.8"><h1>${order.product} ${paymentName} 결제</h1><p>결제 금액 <strong>${order.amount.toLocaleString("ko-KR")}원</strong></p><p>${order.method === "EASYPAY" ? (preferredPay ? `NICE 창의 간편결제 탭에서 ${paymentName}를 선택해 주세요.` : "NICE 창의 간편결제 탭에서 이용할 수단을 선택해 주세요.") : "NICE 창에서 결제할 카드를 선택해 주세요."} 결제 완료 후 분석을 자동으로 시작합니다.</p><form name="payForm" method="post" accept-charset="euc-kr" action="/api/checkouts/nicepay/return">${hidden}<button type="button" id="openNice">카드·간편결제 창 열기</button></form><p id="status" role="status"></p><a href="/analysis/prepare">입력 확인으로 돌아가기</a><script src="https://pg-web.nicepay.co.kr/v3/common/js/nicepay-pgweb.js"></script><script>function nicepaySubmit(){document.payForm.submit()}function nicepayClose(){document.getElementById('status').textContent='결제창을 닫았습니다. 다시 열어 이어서 진행할 수 있습니다.'}function openNice(){if(typeof goPay==='function'){goPay(document.payForm)}else{document.getElementById('status').textContent='결제창을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'}}document.getElementById('openNice').onclick=openNice;window.addEventListener('load',openNice);</script></body></html>`;
}
export const nicepayPurchaseHtml = nicepayReviewHtml;
