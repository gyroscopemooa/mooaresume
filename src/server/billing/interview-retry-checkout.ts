import "server-only";

import { Polar } from "@polar-sh/sdk";

/**
 * 3,000원 "모의면접 재시도 1회" — Polar 결제.
 *
 * `polar-checkout.ts`(QUICK/PRO/FINAL 전용, 글자수 기반 견적)와 완전히
 * 독립된 파일이다. 이 상품은 고정가라 견적 계산도, `checkout_intents`
 * 재사용 로직도 필요 없다 — 재사용하려다 그 파일들을 억지로 뒤틀기보다
 * 새 파일로 둔다(이 저장소가 기능마다 독립 게이트웨이를 쓰는 관례 그대로,
 * `google-play-checkout.ts`도 같은 이유로 별도 파일).
 *
 * 웹훅 대신 결제 완료 후 돌아온 자리에서 Polar API로 직접 확인한다
 * (`confirmInterviewRetryCheckout`) — `polar-webhook.ts`의 처리 경로는
 * QUICK/PRO/FINAL 글자수 견적 검증에 맞춰져 있어, 이 상품을 억지로
 * 끼워 넣으면 그 보호된 경로를 흔들게 된다. `polar-checkout-reconciliation.ts`가
 * 이미 쓰는 "checkouts.get + orders.list로 직접 확인" 방식을 그대로 따른다.
 */

export const INTERVIEW_RETRY_PRICE_KRW = 3_000;

function getConfig() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  const productId = process.env.POLAR_INTERVIEW_RETRY_PRODUCT_ID;
  const rawServer = process.env.POLAR_SERVER?.trim().toLowerCase();
  const server = rawServer === "production" ? "production" : "sandbox";
  if (!accessToken || !productId) {
    throw new Error("POLAR_ACCESS_TOKEN, POLAR_INTERVIEW_RETRY_PRODUCT_ID가 필요합니다.");
  }
  return { accessToken, productId, server } as const;
}

export async function createInterviewRetryCheckout(input: {
  analysisRunId: string;
  externalCustomerId: string;
  customerEmail?: string;
  successUrl: string;
  returnUrl: string;
}): Promise<{ checkoutId: string; checkoutUrl: string; expiresAt: string }> {
  const config = getConfig();
  const polar = new Polar({ accessToken: config.accessToken, server: config.server });
  const checkout = await polar.checkouts.create({
    products: [config.productId],
    prices: {
      [config.productId]: [{
        amountType: "fixed",
        priceCurrency: "krw",
        priceAmount: INTERVIEW_RETRY_PRICE_KRW,
        taxBehavior: "inclusive",
      }],
    },
    metadata: { kind: "INTERVIEW_RETRY", analysisRunId: input.analysisRunId },
    externalCustomerId: input.externalCustomerId,
    customerEmail: input.customerEmail,
    successUrl: input.successUrl,
    returnUrl: input.returnUrl,
    currency: "krw",
    locale: "ko-KR",
    allowDiscountCodes: false,
    allowTrial: false,
  }, { timeoutMs: 10_000 });

  return { checkoutId: checkout.id, checkoutUrl: checkout.url, expiresAt: checkout.expiresAt.toISOString() };
}

export type InterviewRetryConfirmation =
  | { disposition: "PENDING"; status: string }
  | { disposition: "PAID"; orderId: string; amount: number; currency: string; paidAt: string };

export async function confirmInterviewRetryCheckout(input: {
  checkoutId: string;
  externalCustomerId: string;
}): Promise<InterviewRetryConfirmation> {
  const config = getConfig();
  const polar = new Polar({ accessToken: config.accessToken, server: config.server });

  const checkout = await polar.checkouts.get({ id: input.checkoutId }, { timeoutMs: 10_000 });
  if (checkout.externalCustomerId !== input.externalCustomerId) throw new Error("POLAR_CHECKOUT_OWNER_MISMATCH");
  if (checkout.productId !== config.productId) throw new Error("POLAR_PRODUCT_MISMATCH");
  if (checkout.status !== "succeeded") return { disposition: "PENDING", status: checkout.status };

  const pages = await polar.orders.list({ checkoutId: input.checkoutId, limit: 5 }, { timeoutMs: 10_000 });
  let order: { id: string; paid: boolean; status: string; totalAmount: number; currency: string; createdAt: Date; modifiedAt: Date | null } | undefined;
  for await (const page of pages) {
    order = page.result.items.find((item) => item.paid && item.status === "paid");
    break;
  }
  if (!order) return { disposition: "PENDING", status: checkout.status };

  return {
    disposition: "PAID",
    orderId: order.id,
    amount: order.totalAmount,
    currency: order.currency.toLowerCase(),
    paidAt: (order.modifiedAt ?? order.createdAt).toISOString(),
  };
}
