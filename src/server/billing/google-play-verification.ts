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
};

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
};

export class GooglePlayVerificationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "GooglePlayVerificationError";
  }
}

/**
 * Verifies a Google Play purchase the client already completed (inside the
 * Play Store TWA, via the Digital Goods API + Payment Request API) and, if
 * valid, grants the same kind of entitlement a paid Polar order grants.
 *
 * Unlike Polar, there is no server-created checkout session here — the
 * purchase already happened client-side, and this function's job is only to
 * confirm it really happened before handing out the entitlement it paid for.
 */
export async function processGooglePlayPurchase(input: {
  rawRequest: unknown;
  loadContext: (analysisRunId: string) => Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
  /** One product-id ladder per tier — see GooglePlayConfiguration.productIds. */
  expectedProductIds: Record<ProductTier, ReadonlyArray<string>>;
  fetchPurchase: (productId: string, purchaseToken: string) => Promise<GooglePlayPurchase>;
  acknowledgePurchase: (productId: string, purchaseToken: string) => Promise<void>;
  repository: GooglePlayEntitlementRepository;
}): Promise<{ repositoryResult: string; quote: CheckoutQuote }> {
  const request = verifyGooglePlayPurchaseRequestSchema.parse(input.rawRequest);
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
      "이 분량은 아직 Play 앱 결제로 지원하지 않습니다. 웹 브라우저에서 결제해 주세요.",
      "GOOGLE_PLAY_TIER_UNSUPPORTED",
    );
  }
  if (request.productId !== requiredProductId) {
    throw new GooglePlayVerificationError("상품 정보가 일치하지 않습니다.", "GOOGLE_PLAY_PRODUCT_MISMATCH");
  }

  const purchase = await input.fetchPurchase(request.productId, request.purchaseToken);
  if (purchase.purchaseState !== 0) {
    throw new GooglePlayVerificationError("결제가 완료되지 않았습니다.", "GOOGLE_PLAY_NOT_PURCHASED");
  }

  // Must happen before granting, not after: Play auto-refunds an
  // unacknowledged purchase within 3 days, and a purchase acknowledged only
  // on a later retry would leave a real charge unacknowledged if the process
  // crashed between granting and acknowledging.
  if (purchase.acknowledgementState === 0) {
    await input.acknowledgePurchase(request.productId, request.purchaseToken);
  }

  const payloadSha256 = createHash("sha256").update(JSON.stringify(purchase)).digest("hex");
  const repositoryResult = await input.repository.grantPaidOrder({
    // purchaseToken, not orderId, is the dedup key: it is what the client
    // would resend on a retried call, and it is guaranteed unique per
    // purchase attempt even before Play has assigned an orderId.
    eventId: request.purchaseToken,
    payloadSha256,
    providerOrderId: purchase.orderId ?? request.purchaseToken,
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
    },
  });

  return { repositoryResult, quote };
}
