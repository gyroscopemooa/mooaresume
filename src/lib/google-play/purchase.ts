"use client";

export type GooglePlayProductTier = "QUICK" | "PRO" | "FINAL";

/**
 * Play product ids are not secret — they are visible in the Play Store
 * listing and inside the installed app itself — so they are safe as
 * NEXT_PUBLIC_ vars, unlike GOOGLE_PLAY_SERVICE_ACCOUNT_JSON which never
 * leaves the server (src/server/billing/google-play-checkout.ts).
 *
 * One ladder per tier, index 0 = base product (0 extra blocks), index n = n
 * extra blocks — mirrors GooglePlayConfiguration.productIds on the server
 * (google-play-checkout.ts) and domain/google-play-billing.ts's
 * MAX_GOOGLE_PLAY_EXTRA_BLOCKS. Written out literally rather than built from
 * a loop over a dynamic key: Next.js only inlines a NEXT_PUBLIC_ var written
 * as a literal `process.env.NEXT_PUBLIC_X` into the client bundle, not one
 * read through a computed key — so this list has to be updated by hand if
 * MAX_GOOGLE_PLAY_EXTRA_BLOCKS ever changes.
 */
const GOOGLE_PLAY_PRODUCT_ID_LADDERS: Record<GooglePlayProductTier, ReadonlyArray<string | undefined>> = {
  QUICK: [
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_QUICK_PRODUCT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_QUICK_EXTRA_1_PRODUCT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_QUICK_EXTRA_2_PRODUCT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_QUICK_EXTRA_3_PRODUCT_ID,
  ],
  PRO: [
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_PRO_PRODUCT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_PRO_EXTRA_1_PRODUCT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_PRO_EXTRA_2_PRODUCT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_PRO_EXTRA_3_PRODUCT_ID,
  ],
  FINAL: [
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_FINAL_PRODUCT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_FINAL_EXTRA_1_PRODUCT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_FINAL_EXTRA_2_PRODUCT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_FINAL_EXTRA_3_PRODUCT_ID,
  ],
};

function getGooglePlayProductId(tier: GooglePlayProductTier, extraBlocks: number): string | null {
  return GOOGLE_PLAY_PRODUCT_ID_LADDERS[tier][extraBlocks] ?? null;
}

/** 3,000원 "모의면접 재시도 1회" — QUICK/PRO/FINAL 사다리와 무관한 별도 상품. */
const INTERVIEW_RETRY_PRODUCT_ID = process.env.NEXT_PUBLIC_GOOGLE_PLAY_INTERVIEW_RETRY_PRODUCT_ID;

/**
 * True only inside a Trusted Web Activity launched from an app installed via
 * Google Play — the Digital Goods API does not exist in a normal browser tab,
 * so this is also how the checkout button decides which provider to use.
 */
export function isGooglePlayBillingAvailable(): boolean {
  return typeof window !== "undefined" && "getDigitalGoodsService" in window;
}

export class GooglePlayPurchaseCancelledError extends Error {
  constructor() {
    super("결제를 취소했습니다.");
    this.name = "GooglePlayPurchaseCancelledError";
  }
}

type DigitalGoodsService = {
  getDetails(itemIds: string[]): Promise<Array<{ itemId: string; price: { currency: string; value: string } }>>;
};

/**
 * Runs the Play Billing purchase flow for one product and returns the
 * resulting purchase token, unverified — the server verifies it against the
 * Play Developer API before granting anything (see
 * src/server/billing/google-play-verification.ts). This function only talks
 * to the device's Play Billing UI, never to our own server.
 */
export async function purchaseProductViaGooglePlay(
  tier: GooglePlayProductTier,
  extraBlocks: number,
): Promise<{ purchaseToken: string; productId: string }> {
  const productId = getGooglePlayProductId(tier, extraBlocks);
  if (!productId) {
    throw new Error(
      extraBlocks > 0
        ? "이 분량은 아직 Play 결제로 지원하지 않습니다. 웹 브라우저에서 결제해 주세요."
        : `이 상품(${tier})은 아직 Play 결제로 열리지 않았습니다.`,
    );
  }
  return purchaseGooglePlayProduct(productId);
}

/** 모의면접 재시도 1회 구매 — 같은 Digital Goods API 흐름, 고정가 단일 상품. */
export async function purchaseInterviewRetryViaGooglePlay(): Promise<{ purchaseToken: string; productId: string }> {
  if (!INTERVIEW_RETRY_PRODUCT_ID) {
    throw new Error("이 상품은 아직 Play 결제로 열리지 않았습니다.");
  }
  return purchaseGooglePlayProduct(INTERVIEW_RETRY_PRODUCT_ID);
}

async function purchaseGooglePlayProduct(productId: string): Promise<{ purchaseToken: string; productId: string }> {
  const getService = (window as unknown as {
    getDigitalGoodsService?: (paymentMethod: string) => Promise<DigitalGoodsService>;
  }).getDigitalGoodsService;
  if (!getService) {
    throw new Error("이 화면에서는 Play 결제를 사용할 수 없습니다.");
  }

  const service = await getService("https://play.google.com/billing");
  const [item] = await service.getDetails([productId]);
  if (!item) {
    throw new Error("Play 상품 정보를 확인하지 못했습니다.");
  }

  const request = new PaymentRequest(
    [{ supportedMethods: "https://play.google.com/billing", data: { sku: productId } }],
    { total: { label: "총액", amount: item.price } },
  );

  let response: PaymentResponse;
  try {
    response = await request.show();
  } catch {
    throw new GooglePlayPurchaseCancelledError();
  }

  const purchaseToken = (response.details as { purchaseToken?: string } | null)?.purchaseToken;
  await response.complete("success");
  if (!purchaseToken) {
    throw new Error("결제 토큰을 받지 못했습니다.");
  }
  return { purchaseToken, productId };
}
