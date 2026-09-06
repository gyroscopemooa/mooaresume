import "server-only";

import { Polar } from "@polar-sh/sdk";
import { RESUME_BUILD_PRICE_KRW } from "@/domain/resume-build";
import { getPolarCheckoutConfiguration } from "./polar-checkout";

/**
 * AI 이력서 제작 1건의 결제.
 *
 * 첨삭 결제(`polar-checkout.ts` · `polar-webhook.ts`)를 고치지 않습니다. 그쪽은
 * 웹훅으로 이용권을 발급하는데, 이용권은 "지원 건 하나"에 붙는 개념이라 이력서
 * 제작에는 맞지 않습니다. 그리고 웹훅 처리기를 함께 손대면 자소서 결제 전체가
 * 이 기능의 버그에 걸립니다.
 *
 * 대신 **실행하는 순간 Polar에 직접 물어봅니다**(checkouts.get). 한 번 산 건을
 * 두 번 쓰는 것은 우리 표의 상태 전이로 막습니다(resume_builds.status). 웹훅이
 * 늦거나 유실돼도 결제한 사람이 기다리지 않는다는 장점도 있습니다.
 */

export function getResumeBuildProductId(): string {
  const productId = process.env.POLAR_RESUME_PRODUCT_ID?.trim();
  // 이름을 붙여 던집니다. 빈 값으로 보내면 Polar가 422를 주는데, 그 응답은
  // 다른 모든 설정 실수와 똑같이 생겼습니다.
  if (!productId) throw new Error("POLAR_RESUME_PRODUCT_ID가 필요합니다.");
  return productId;
}

function client() {
  const config = getPolarCheckoutConfiguration();
  return new Polar({ accessToken: config.accessToken, server: config.server });
}

export type ResumeBuildCheckoutSession = { checkoutId: string; checkoutUrl: string; expiresAt: string };

export async function createResumeBuildCheckout(input: {
  buildId: string;
  userId: string;
  customerEmail?: string;
  customerIpAddress?: string;
  successUrl: string;
  returnUrl: string;
}): Promise<ResumeBuildCheckoutSession> {
  const productId = getResumeBuildProductId();
  const checkout = await client().checkouts.create({
    products: [productId],
    prices: {
      [productId]: [{ amountType: "fixed", priceCurrency: "krw", priceAmount: RESUME_BUILD_PRICE_KRW, taxBehavior: "inclusive" }],
    },
    metadata: { kind: "RESUME_BUILD", resumeBuildId: input.buildId },
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

export type ResumeBuildPaymentCheck =
  | { paid: true }
  | { paid: false; reason: "NOT_PAID" | "PRODUCT_MISMATCH" | "OWNER_MISMATCH" | "BUILD_MISMATCH" };

/**
 * 이 결제가 정말 이 사람의, 이 건의, 이 상품의 결제인지 봅니다.
 *
 * 넷 다 봅니다. 결제 상태만 보면 남의 결제 번호를 주워 자기 건을 여는 길이
 * 열리고(외부 고객 id), 상품을 안 보면 5,900원짜리 첨삭 결제 하나로 이력서를
 * 계속 만들 수 있습니다(상품 id). 금액은 할인 코드가 붙을 수 있어 상한만 봅니다.
 */
export async function checkResumeBuildPayment(input: {
  checkoutId: string;
  buildId: string;
  userId: string;
}): Promise<ResumeBuildPaymentCheck> {
  const checkout = await client().checkouts.get({ id: input.checkoutId }, { timeoutMs: 10_000 });
  if (checkout.status !== "succeeded") return { paid: false, reason: "NOT_PAID" };
  if (checkout.productId !== getResumeBuildProductId()) return { paid: false, reason: "PRODUCT_MISMATCH" };
  if (checkout.externalCustomerId && checkout.externalCustomerId !== input.userId) return { paid: false, reason: "OWNER_MISMATCH" };
  const metadataBuildId = (checkout.metadata as Record<string, unknown> | undefined)?.resumeBuildId;
  if (typeof metadataBuildId === "string" && metadataBuildId !== input.buildId) return { paid: false, reason: "BUILD_MISMATCH" };
  return { paid: true };
}
