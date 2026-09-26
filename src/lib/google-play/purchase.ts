"use client";

import type { DigitalGoodsItemDetails, DigitalGoodsServiceLike } from "./app-checkout";
import { isInstalledAppContext } from "@/lib/app-context";

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
  return GOOGLE_PLAY_PRODUCT_ID_LADDERS[tier][extraBlocks] || null;
}

/** 앱 결제 흐름(app-checkout.ts)이 어느 Play 상품을 열지 고를 때 씁니다. */
export function resolveGooglePlayProductId(tier: GooglePlayProductTier, extraBlocks: number): string | null {
  return getGooglePlayProductId(tier, extraBlocks);
}

/** 3,000원 "모의면접 재시도 1회" — QUICK/PRO/FINAL 사다리와 무관한 별도 상품. */
const INTERVIEW_RETRY_PRODUCT_ID = process.env.NEXT_PUBLIC_GOOGLE_PLAY_INTERVIEW_RETRY_PRODUCT_ID;

/**
 * True only inside a Trusted Web Activity launched from an app installed via
 * Google Play. The Digital Goods API is also present in Android Chrome tabs, so
 * the installed-app context (app-context.ts) is checked as well; this is how the
 * checkout button decides which provider to use.
 */
export function isGooglePlayBillingAvailable(): boolean {
  // Android 일반 Chrome 탭에도 Digital Goods가 있으므로(2026-09-26 실기기 확인) 기능 존재만으로는
  // 부족합니다. 설치된 앱 안에서만 Play 결제를 씁니다; 일반 웹은 Polar.
  return typeof window !== "undefined" && "getDigitalGoodsService" in window && isInstalledAppContext();
}

export class GooglePlayPurchaseCancelledError extends Error {
  constructor() {
    super("결제를 취소했습니다.");
    this.name = "GooglePlayPurchaseCancelledError";
  }
}

type DigitalGoodsService = DigitalGoodsServiceLike;

/**
 * Play 결제 서비스 핸들. 앱 결제 흐름(app-checkout.ts)은 상품 조회·보유 구매
 * 확인·소비를 한 서비스 객체로 이어서 하므로, 이 함수가 그 핸들을 넘깁니다.
 */
let lastDigitalGoodsError = "";

/** 마지막으로 결제 서비스를 못 얻은 이유(화면에 보여 줄 짧은 글). 폰에서는 로그를 볼 수 없어서 남깁니다. */
export function describeDigitalGoodsFailure(): string {
  return lastDigitalGoodsError;
}

export async function openDigitalGoodsService(): Promise<DigitalGoodsService | null> {
  lastDigitalGoodsError = "";
  const getService = (window as unknown as {
    getDigitalGoodsService?: (paymentMethod: string) => Promise<DigitalGoodsService>;
  }).getDigitalGoodsService;
  if (!getService) {
    lastDigitalGoodsError = "getDigitalGoodsService 없음";
    return null;
  }
  try {
    return await getService("https://play.google.com/billing");
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    const message = error instanceof Error ? error.message : String(error);
    lastDigitalGoodsError = `${name}: ${message}`.slice(0, 160);
    return null;
  }
}

/** 결제 창을 띄우고 구매 토큰만 돌려줍니다. 검증은 서버가 합니다. */
export async function requestGooglePlayPayment(details: DigitalGoodsItemDetails): Promise<string> {
  const request = new PaymentRequest(
    [{ supportedMethods: "https://play.google.com/billing", data: { sku: details.itemId } }],
    { total: { label: "총액", amount: details.price } },
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
  return purchaseToken;
}

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

/** 앱 결제 흐름(app-checkout.ts)이 모의면접 재시도 상품을 열 때 씁니다. */
export function resolveInterviewRetryProductId(): string | null {
  return INTERVIEW_RETRY_PRODUCT_ID || null;
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
