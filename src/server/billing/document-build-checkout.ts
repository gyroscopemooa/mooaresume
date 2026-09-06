import "server-only";

import { Polar } from "@polar-sh/sdk";
import { getPolarCheckoutConfiguration } from "./polar-checkout";

/**
 * "1건 사서 1건 만든다" 상품의 공통 결제.
 *
 * 첨삭 결제(`polar-checkout.ts` · `polar-webhook.ts`)는 건드리지 않습니다.
 * 그쪽은 웹훅으로 이용권을 발급하는데, 이용권은 "지원 건 하나"에 붙는 개념이라
 * 여기에는 맞지 않고, 웹훅 처리기를 함께 손대면 자소서 결제 전체가 이 기능들의
 * 버그에 걸립니다.
 *
 * 대신 **실행하는 순간 Polar에 직접 물어봅니다**(checkouts.get). 한 번 산 건을
 * 두 번 쓰는 것은 각 표의 상태 전이로 막습니다. 웹훅이 늦거나 유실돼도 결제한
 * 사람이 기다리지 않는다는 장점도 있습니다.
 *
 * 상품 id는 환경변수 이름으로 받습니다. 값이 비어 있으면 **그 상품의 결제만**
 * 이름을 붙여 실패하고 나머지는 그대로 돕니다 — 상품 하나를 아직 안 만들었다고
 * 팔고 있던 것까지 멈추면 안 됩니다.
 */

export type DocumentBuildProduct = {
  /** Polar 상품 id가 담긴 환경변수 이름. */
  productIdEnv: string;
  /** 결제 metadata에 남길 상품 종류. 나중에 정산·환불에서 이 값으로 찾습니다. */
  kind: string;
  /** metadata에서 건 id를 담을 열쇠 이름. */
  buildIdKey: string;
  /** 사람에게 보일 이름. 실패 문구에 씁니다. */
  label: string;
};

export function getDocumentBuildProductId(product: DocumentBuildProduct): string {
  const productId = process.env[product.productIdEnv]?.trim();
  // 이름을 붙여 던집니다. 빈 값으로 보내면 Polar가 422를 주는데, 그 응답은
  // 다른 모든 설정 실수와 똑같이 생겼습니다.
  if (!productId) throw new Error(`${product.productIdEnv}가 필요합니다.`);
  return productId;
}

function client() {
  const config = getPolarCheckoutConfiguration();
  return new Polar({ accessToken: config.accessToken, server: config.server });
}

export type DocumentBuildCheckoutSession = { checkoutId: string; checkoutUrl: string; expiresAt: string };

export async function createDocumentBuildCheckout(product: DocumentBuildProduct, input: {
  buildId: string;
  userId: string;
  priceKrw: number;
  customerEmail?: string;
  customerIpAddress?: string;
  successUrl: string;
  returnUrl: string;
}): Promise<DocumentBuildCheckoutSession> {
  const productId = getDocumentBuildProductId(product);
  const checkout = await client().checkouts.create({
    products: [productId],
    prices: {
      [productId]: [{ amountType: "fixed", priceCurrency: "krw", priceAmount: input.priceKrw, taxBehavior: "inclusive" }],
    },
    metadata: { kind: product.kind, [product.buildIdKey]: input.buildId },
    externalCustomerId: input.userId,
    customerEmail: input.customerEmail,
    customerIpAddress: input.customerIpAddress,
    successUrl: input.successUrl,
    returnUrl: input.returnUrl,
    currency: "krw",
    locale: "ko-KR",
    allowDiscountCodes: true,
    allowTrial: false,
  }, { timeoutMs: 10_000 });

  return { checkoutId: checkout.id, checkoutUrl: checkout.url, expiresAt: checkout.expiresAt.toISOString() };
}

export type DocumentBuildPaymentCheck =
  | { paid: true }
  | { paid: false; reason: "NOT_PAID" | "PRODUCT_MISMATCH" | "OWNER_MISMATCH" | "BUILD_MISMATCH" };

/**
 * 이 결제가 정말 이 사람의, 이 건의, 이 상품의 결제인지 봅니다.
 *
 * 넷 다 봅니다. 결제 상태만 보면 남의 결제 번호를 주워 자기 건을 여는 길이
 * 열리고(외부 고객 id), 상품을 안 보면 싼 상품 결제 하나로 비싼 문서를 계속
 * 만들 수 있습니다(상품 id). 금액은 할인 코드가 붙을 수 있어 보지 않습니다.
 */
export async function checkDocumentBuildPayment(product: DocumentBuildProduct, input: {
  checkoutId: string;
  buildId: string;
  userId: string;
}): Promise<DocumentBuildPaymentCheck> {
  const checkout = await client().checkouts.get({ id: input.checkoutId }, { timeoutMs: 10_000 });
  if (checkout.status !== "succeeded") return { paid: false, reason: "NOT_PAID" };
  if (checkout.productId !== getDocumentBuildProductId(product)) return { paid: false, reason: "PRODUCT_MISMATCH" };
  if (checkout.externalCustomerId && checkout.externalCustomerId !== input.userId) return { paid: false, reason: "OWNER_MISMATCH" };
  const metadataBuildId = (checkout.metadata as Record<string, unknown> | undefined)?.[product.buildIdKey];
  if (typeof metadataBuildId === "string" && metadataBuildId !== input.buildId) return { paid: false, reason: "BUILD_MISMATCH" };
  return { paid: true };
}
