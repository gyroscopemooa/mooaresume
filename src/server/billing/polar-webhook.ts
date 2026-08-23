import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { validateEvent } from "@polar-sh/sdk/webhooks";
import { createCheckoutQuote, productTierSchema, type ProductTier } from "@/domain/usage-entitlement";

const paidMetadataSchema = z.object({
  applicationCaseId: z.string().uuid(),
  tier: productTierSchema,
  totalCharacters: z.coerce.number().int().nonnegative(),
  baseCharacters: z.coerce.number().int().positive(),
  includedCharacters: z.coerce.number().int().positive(),
  extraBlocks: z.coerce.number().int().nonnegative(),
  allowedCharacters: z.coerce.number().int().positive(),
});

type VerifiedPolarEvent = ReturnType<typeof validateEvent>;

export type PolarPaidOrder = {
  paid: boolean;
  status: string;
  productId: string | null;
  currency: string;
  totalAmount: number;
  discountId?: string | null;
  metadata: unknown;
};

export type PolarEntitlementRepository = {
  grantPaidOrder(input: {
    eventId: string;
    eventType: "order.paid";
    payloadSha256: string;
    providerOrderId: string;
    providerCheckoutId: string;
    applicationCaseId: string;
    product: ProductTier;
    allowedCharacters: number;
    amount: number;
    currency: string;
    paidAt: string;
    metadata: Record<string, unknown>;
  }): Promise<string>;
  refundOrder(input: {
    eventId: string;
    eventType: "order.refunded";
    payloadSha256: string;
    providerOrderId: string;
    refundedAt: string;
    requiresReview: boolean;
  }): Promise<string>;
};

export type PolarWebhookProcessResult =
  | { disposition: "IGNORED"; eventType: string; reason: string }
  | { disposition: "PROCESSED"; eventType: string; repositoryResult: string };

function getEventId(headers: Record<string, string>) {
  const eventId = headers["webhook-id"];
  if (!eventId) throw new Error("POLAR_WEBHOOK_ID_MISSING");
  return eventId;
}

export function validatePolarPaidOrder(
  order: PolarPaidOrder,
  expectedProductIds: Record<ProductTier, string>,
) {
  if (!order.paid || order.status !== "paid") {
    throw new Error("POLAR_ORDER_NOT_PAID");
  }
  const metadata = paidMetadataSchema.parse(order.metadata);
  if (order.productId !== expectedProductIds[metadata.tier]) {
    throw new Error("POLAR_PRODUCT_MISMATCH");
  }
  if (order.currency.toLowerCase() !== "krw") {
    throw new Error("POLAR_CURRENCY_MISMATCH");
  }

  const quote = createCheckoutQuote(metadata.tier, metadata.totalCharacters);
  if (
    metadata.baseCharacters !== quote.baseCharacters
    || metadata.includedCharacters !== quote.includedCharacters
    || metadata.extraBlocks !== quote.extraBlocks
    || metadata.allowedCharacters !== quote.allowedCharacters
  ) {
    throw new Error("POLAR_METADATA_QUOTE_MISMATCH");
  }
  const discounted = order.totalAmount !== quote.totalPriceKrw;
  // A 100%-off discount code legitimately produces totalAmount === 0 — the
  // discountId check right below already rejects a zero amount with no
  // discount attached, so zero itself is not suspicious.
  if (
    order.totalAmount < 0
    || order.totalAmount > quote.totalPriceKrw
    || (discounted && !order.discountId)
  ) {
    throw new Error("POLAR_ORDER_AMOUNT_MISMATCH");
  }

  return metadata;
}

export async function processPolarWebhook(input: {
  rawBody: string;
  headers: Record<string, string>;
  secret: string;
  expectedProductIds: Record<ProductTier, string>;
  repository: PolarEntitlementRepository;
  verifyEvent?: typeof validateEvent;
}): Promise<PolarWebhookProcessResult> {
  const verifyEvent = input.verifyEvent ?? validateEvent;
  const event = verifyEvent(input.rawBody, input.headers, input.secret);
  const eventId = getEventId(input.headers);
  const payloadSha256 = createHash("sha256").update(input.rawBody).digest("hex");

  if (event.type === "order.paid" || (event.type === "order.updated" && event.data.status === "paid")) {
    const paidEvent = event as unknown as Extract<VerifiedPolarEvent, { type: "order.paid" }>;
    const metadata = validatePolarPaidOrder(paidEvent.data, input.expectedProductIds);
    const repositoryResult = await input.repository.grantPaidOrder({
      eventId,
      eventType: "order.paid",
      payloadSha256,
      providerOrderId: event.data.id,
      providerCheckoutId: event.data.checkoutId ?? "",
      applicationCaseId: metadata.applicationCaseId,
      product: metadata.tier,
      allowedCharacters: metadata.allowedCharacters,
      amount: event.data.totalAmount,
      currency: event.data.currency.toLowerCase(),
      paidAt: event.timestamp.toISOString(),
      metadata: {
        tier: metadata.tier,
        totalCharacters: metadata.totalCharacters,
        baseCharacters: metadata.baseCharacters,
        includedCharacters: metadata.includedCharacters,
        extraBlocks: metadata.extraBlocks,
        allowedCharacters: metadata.allowedCharacters,
      },
    });
    return { disposition: "PROCESSED", eventType: event.type, repositoryResult };
  }

  if (event.type === "order.refunded") {
    const repositoryResult = await input.repository.refundOrder({
      eventId,
      eventType: "order.refunded",
      payloadSha256,
      providerOrderId: event.data.id,
      refundedAt: event.timestamp.toISOString(),
      requiresReview: event.data.refundedAmount < event.data.netAmount,
    });
    return { disposition: "PROCESSED", eventType: event.type, repositoryResult };
  }

  return {
    disposition: "IGNORED",
    eventType: event.type,
    reason: "UNSUPPORTED_EVENT",
  };
}
