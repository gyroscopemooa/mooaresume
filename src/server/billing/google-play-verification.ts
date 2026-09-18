import { createHash } from "node:crypto";
import { z } from "zod";
import { createCheckoutQuote, productTierSchema, type CheckoutQuote, type ProductTier } from "@/domain/usage-entitlement";

export const verifyGooglePlayPurchaseRequestSchema = z.object({
  analysisRunId: z.string().uuid(),
  purchaseToken: z.string().min(1),
  productId: z.string().min(1),
});

const googlePlayCheckoutContextSchema = z.object({
  analysisRunId: z.string().uuid(),
  applicationCaseId: z.string().uuid(),
  product: productTierSchema,
  totalCharacters: z.number().int().positive(),
});

export type GooglePlayCheckoutContext = z.infer<typeof googlePlayCheckoutContextSchema>;

/**
 * The fields this module reads off androidpublisher's `purchases.products.get`
 * response (Schema$ProductPurchase) — trimmed to only what verification
 * needs, so the route's real client can be swapped for a test double without
 * dragging the full googleapis response type into tests.
 */
export type GooglePlayPurchase = {
  purchaseState: number | null | undefined; // 0 = purchased, 1 = canceled, 2 = pending
  orderId?: string | null;
  acknowledgementState?: number | null; // 0 = yet to be acknowledged, 1 = acknowledged
  /** ISO 3166-1 alpha-2 of the buyer's Play account. */
  regionCode?: string | null;
};

/** Where an earlier verified purchase was already turned into an entitlement. */
export type GooglePlayExistingGrant = { applicationCaseId: string; ownerUserId: string };

export type GooglePlayEntitlementRepository = {
  grantPaidOrder(input: {
    eventId: string;
    payloadSha256: string;
    providerOrderId: string;
    applicationCaseId: string;
    product: ProductTier;
    allowedCharacters: number;
    amount: number;
    currency: string;
    paidAt: string;
    metadata: Record<string, unknown>;
  }): Promise<string>;
  /**
   * Looks up an order already granted for this purchase. `purchaseTokenSha256`
   * is recorded in the order metadata from 2026-09-18; `providerOrderId` covers
   * orders granted before that (Play orderId, or the token when Play had none).
   */
  findExistingGrant(input: { purchaseTokenSha256: string; providerOrderId: string | null }): Promise<GooglePlayExistingGrant | null>;
};

export class GooglePlayVerificationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    /**
     * Whether the client may consume (finish) this Play purchase. True only
     * when an entitlement already exists for it — consuming anything else
     * would let Play sell the same item again while the payment was never
     * turned into an analysis.
     */
    public readonly consumable = false,
  ) {
    super(message);
    this.name = "GooglePlayVerificationError";
  }
}

export type GooglePlayVerificationResult = {
  repositoryResult: "GRANTED" | "ALREADY_GRANTED";
  quote: CheckoutQuote | null;
  consumable: true;
};

export function hashPurchaseToken(purchaseToken: string): string {
  return createHash("sha256").update(`mooa:google-play-token:${purchaseToken}`).digest("hex");
}

/**
 * Verifies a Google Play purchase the client already completed (inside the
 * Play Store TWA, via the Digital Goods API + Payment Request API) and, if
 * valid, grants the same kind of entitlement a paid Polar order grants.
 *
 * Unlike Polar, there is no server-created checkout session here — the
 * purchase already happened client-side, and this function's job is only to
 * confirm it really happened before handing out the entitlement it paid for.
 *
 * Safe to call again with the same token (a retried request, or the app
 * recovering an unfinished purchase after a crash): an already granted token
 * answers ALREADY_GRANTED for its own application case and is refused for any
 * other, before the run's checkout context is loaded — loading it would fail
 * with ACTIVE_ENTITLEMENT_EXISTS for the very run the purchase already paid
 * for, and the client would never be told it may finish the purchase.
 */
export async function processGooglePlayPurchase(input: {
  rawRequest: unknown;
  currentUserId: string;
  /** The run's application case, read with the caller's own RLS client. */
  loadRunCaseId: (analysisRunId: string) => Promise<string | null>;
  loadContext: (analysisRunId: string) => Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
  /** One product-id ladder per tier — see GooglePlayConfiguration.productIds. */
  expectedProductIds: Record<ProductTier, ReadonlyArray<string>>;
  fetchPurchase: (productId: string, purchaseToken: string) => Promise<GooglePlayPurchase>;
  acknowledgePurchase: (productId: string, purchaseToken: string) => Promise<void>;
  repository: GooglePlayEntitlementRepository;
}): Promise<GooglePlayVerificationResult> {
  const request = verifyGooglePlayPurchaseRequestSchema.parse(input.rawRequest);
  const purchaseTokenSha256 = hashPurchaseToken(request.purchaseToken);

  const answerExistingGrant = async (grant: GooglePlayExistingGrant): Promise<GooglePlayVerificationResult> => {
    const runCaseId = await input.loadRunCaseId(request.analysisRunId);
    if (grant.ownerUserId === input.currentUserId && runCaseId === grant.applicationCaseId) {
      return { repositoryResult: "ALREADY_GRANTED", quote: null, consumable: true };
    }
    throw new GooglePlayVerificationError(
      "이 결제는 이미 다른 지원 건에 적용되었습니다. 이 지원 건은 새로 결제해 주세요.",
      "GOOGLE_PLAY_PURCHASE_ALREADY_APPLIED",
      true,
    );
  };

  const earlier = await input.repository.findExistingGrant({ purchaseTokenSha256, providerOrderId: null });
  if (earlier) return answerExistingGrant(earlier);

  const loaded = await input.loadContext(request.analysisRunId);
  if (loaded.error) {
    throw new GooglePlayVerificationError(
      "결제할 지원 건을 확인하지 못했습니다.",
      loaded.error.code ?? "CHECKOUT_CONTEXT_FAILED",
    );
  }

  const context = googlePlayCheckoutContextSchema.parse(loaded.data);
  if (context.analysisRunId !== request.analysisRunId) {
    throw new GooglePlayVerificationError("분석 실행 정보가 일치하지 않습니다.", "ANALYSIS_RUN_MISMATCH");
  }

  const quote = createCheckoutQuote(context.product, context.totalCharacters);
  // Play Console prices a product id as one fixed amount — there is no
  // equivalent of Polar's per-checkout price computed from document length.
  // So instead of one product per tier, there is a short ladder of them (see
  // MAX_GOOGLE_PLAY_EXTRA_BLOCKS): index 0 is the base product, index n is
  // priced for n extra blocks. A document whose extraBlocks has no rung on
  // the ladder is refused here rather than granted fewer characters than it
  // needs; the person is told to use the web checkout instead, where the
  // price is computed exactly for any length.
  const requiredProductId = input.expectedProductIds[context.product][quote.extraBlocks];
  if (!requiredProductId) {
    throw new GooglePlayVerificationError(
      "이 분량은 아직 Play 앱 결제로 지원하지 않습니다. 분량을 줄이거나 문의해 주세요.",
      "GOOGLE_PLAY_TIER_UNSUPPORTED",
    );
  }
  if (request.productId !== requiredProductId) {
    throw new GooglePlayVerificationError("상품 정보가 일치하지 않습니다.", "GOOGLE_PLAY_PRODUCT_MISMATCH");
  }

  const purchase = await input.fetchPurchase(request.productId, request.purchaseToken);
  if (purchase.purchaseState === 2) {
    // Still unpaid (e.g. cash/convenience-store payment). Not acknowledged and
    // not consumable: the client keeps the token and asks again later.
    throw new GooglePlayVerificationError(
      "결제 승인을 기다리는 중입니다. 승인이 끝나면 같은 화면에서 다시 시도해 주세요. 추가 결제는 되지 않습니다.",
      "GOOGLE_PLAY_PENDING",
    );
  }
  if (purchase.purchaseState !== 0) {
    throw new GooglePlayVerificationError("결제가 완료되지 않았습니다.", "GOOGLE_PLAY_NOT_PURCHASED");
  }

  // The billing ledger records KRW catalogue prices (see `amount` below). A
  // purchase from another storefront is refused before acknowledging, so Play
  // refunds it automatically instead of it being booked as a KRW sale.
  if (purchase.regionCode !== "KR") {
    throw new GooglePlayVerificationError(
      "현재 한국 Google Play 계정의 결제만 지원합니다. 확인되지 않은 결제는 Google Play가 자동으로 환불합니다.",
      "GOOGLE_PLAY_REGION_UNSUPPORTED",
    );
  }

  // Must happen before granting, not after: Play auto-refunds an
  // unacknowledged purchase within 3 days, and a purchase acknowledged only
  // on a later retry would leave a real charge unacknowledged if the process
  // crashed between granting and acknowledging.
  if (purchase.acknowledgementState === 0) {
    await input.acknowledgePurchase(request.productId, request.purchaseToken);
  }

  const providerOrderId = purchase.orderId ?? request.purchaseToken;
  const payloadSha256 = createHash("sha256").update(JSON.stringify(purchase)).digest("hex");
  const repositoryResult = await input.repository.grantPaidOrder({
    // purchaseToken, not orderId, is the dedup key: it is what the client
    // would resend on a retried call, and it is guaranteed unique per
    // purchase attempt even before Play has assigned an orderId.
    eventId: request.purchaseToken,
    payloadSha256,
    providerOrderId,
    applicationCaseId: context.applicationCaseId,
    product: context.product,
    allowedCharacters: quote.allowedCharacters,
    // The Developer API's purchase resource does not return the price that
    // was actually charged — that lives only in Play Console's product
    // catalogue. This amount is the catalogue price this code expects for
    // requiredProductId (base + extraBlocks rungs), not a value read back
    // from the charge itself — it depends on the Play Console price for that
    // product id actually matching this quote's totalPriceKrw.
    amount: quote.totalPriceKrw,
    currency: "krw",
    paidAt: new Date().toISOString(),
    metadata: {
      tier: context.product,
      totalCharacters: context.totalCharacters,
      allowedCharacters: quote.allowedCharacters,
      extraBlocks: quote.extraBlocks,
      productId: request.productId,
      regionCode: purchase.regionCode,
      // A hash, never the token itself: the token is what finishes the
      // purchase on the device.
      purchaseTokenSha256,
    },
  });

  if (repositoryResult === "GRANTED") return { repositoryResult: "GRANTED", quote, consumable: true };

  // DUPLICATE_EVENT / DUPLICATE_ORDER: a concurrent or earlier call won.
  const winner = await input.repository.findExistingGrant({ purchaseTokenSha256, providerOrderId });
  if (winner) return answerExistingGrant(winner);
  throw new GooglePlayVerificationError("구매 기록을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", `GOOGLE_PLAY_${repositoryResult}`);
}
