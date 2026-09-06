import "server-only";

import { Polar } from "@polar-sh/sdk";
import { CAREER_DESCRIPTION_BUILD_PRICE_KRW } from "@/domain/career-description-build";
import { getPolarCheckoutConfiguration } from "./polar-checkout";

/**
 * AI 경력기술서 제작 1건의 결제. 이력서 제작(`resume-build-checkout.ts`)과 같은
 * 이유로 첨삭 결제(웹훅 발급) 경로를 건드리지 않고 따로 둡니다. 실행하는 순간
 * Polar에 직접 물어봅니다(checkouts.get) — 웹훅이 늦거나 유실돼도 결제한
 * 사람이 기다리지 않습니다.
 *
 * `POLAR_CAREER_DESCRIPTION_PRODUCT_ID`는 운영자가 Polar 대시보드에서 상품을
 * 만든 뒤 채워야 하는 값입니다. 값이 없으면 결제 생성이 그 자리에서 실패하므로,
 * 이 기능은 그 값을 넣기 전까지는 실제 결제를 받지 않습니다.
 */

export function getCareerDescriptionBuildProductId(): string {
  const productId = process.env.POLAR_CAREER_DESCRIPTION_PRODUCT_ID?.trim();
  if (!productId) throw new Error("POLAR_CAREER_DESCRIPTION_PRODUCT_ID가 필요합니다.");
  return productId;
}

function client() {
  const config = getPolarCheckoutConfiguration();
  return new Polar({ accessToken: config.accessToken, server: config.server });
}

export type CareerDescriptionBuildCheckoutSession = { checkoutId: string; checkoutUrl: string; expiresAt: string };

export async function createCareerDescriptionBuildCheckout(input: {
  buildId: string;
  userId: string;
  customerEmail?: string;
  customerIpAddress?: string;
  successUrl: string;
  returnUrl: string;
}): Promise<CareerDescriptionBuildCheckoutSession> {
  const productId = getCareerDescriptionBuildProductId();
  const checkout = await client().checkouts.create({
    products: [productId],
    prices: {
      [productId]: [{ amountType: "fixed", priceCurrency: "krw", priceAmount: CAREER_DESCRIPTION_BUILD_PRICE_KRW, taxBehavior: "inclusive" }],
    },
    metadata: { kind: "CAREER_DESCRIPTION_BUILD", careerDescriptionBuildId: input.buildId },
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

export type CareerDescriptionBuildPaymentCheck =
  | { paid: true }
  | { paid: false; reason: "NOT_PAID" | "PRODUCT_MISMATCH" | "OWNER_MISMATCH" | "BUILD_MISMATCH" };

export async function checkCareerDescriptionBuildPayment(input: {
  checkoutId: string;
  buildId: string;
  userId: string;
}): Promise<CareerDescriptionBuildPaymentCheck> {
  const checkout = await client().checkouts.get({ id: input.checkoutId }, { timeoutMs: 10_000 });
  if (checkout.status !== "succeeded") return { paid: false, reason: "NOT_PAID" };
  if (checkout.productId !== getCareerDescriptionBuildProductId()) return { paid: false, reason: "PRODUCT_MISMATCH" };
  if (checkout.externalCustomerId && checkout.externalCustomerId !== input.userId) return { paid: false, reason: "OWNER_MISMATCH" };
  const metadataBuildId = (checkout.metadata as Record<string, unknown> | undefined)?.careerDescriptionBuildId;
  if (typeof metadataBuildId === "string" && metadataBuildId !== input.buildId) return { paid: false, reason: "BUILD_MISMATCH" };
  return { paid: true };
}
