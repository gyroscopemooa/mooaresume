import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { validateEvent } from "@polar-sh/sdk/webhooks";
import { createQuickCheckoutQuote } from "@/domain/usage-entitlement";

const paidMetadataSchema = z.object({
  applicationCaseId: z.string().uuid(),
  tier: z.literal("QUICK"),
  totalCharacters: z.coerce.number().int().nonnegative(),
  baseCharacters: z.coerce.number().int().positive(),
  includedCharacters: z.coerce.number().int().positive(),
  extraBlocks: z.coerce.number().int().nonnegative(),
  allowedCharacters: z.coerce.number().int().positive(),
});

type VerifiedPolarEvent = ReturnType<typeof validateEvent>;

export type PolarEntitlementRepository = {
  grantPaidOrder(input: {
    eventId: string;
    eventType: "order.paid";
    payloadSha256: string;
    providerOrderId: string;
    providerCheckoutId: string;
    applicationCaseId: string;
    product: "QUICK";
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

function assertPaidOrder(
  event: Extract<VerifiedPolarEvent, { type: "order.paid" }>,
  expectedProductId: string,
) {
  if (!event.data.paid || event.data.status !== "paid") {
    throw new Error("POLAR_ORDER_NOT_PAID");
  }
  if (event.data.productId !== expectedProductId) {
    throw new Error("POLAR_PRODUCT_MISMATCH");
  }
  if (event.data.currency.toLowerCase() !== "krw") {
    throw new Error("POLAR_CURRENCY_MISMATCH");
  }

  const metadata = paidMetadataSchema.parse(event.data.metadata);
  const quote = createQuickCheckoutQuote(metadata.totalCharacters);
  if (
    metadata.baseCharacters !== quote.baseCharacters
    || metadata.includedCharacters !== quote.includedCharacters
    || metadata.extraBlocks !== quote.extraBlocks
    || metadata.allowedCharacters !== quote.allowedCharacters
  ) {
    throw new Error("POLAR_METADATA_QUOTE_MISMATCH");
  }
  if (event.data.totalAmount !== quote.totalPriceKrw) {
    throw new Error("POLAR_ORDER_AMOUNT_MISMATCH");
  }

  return metadata;
}

export async function processPolarWebhook(input: {
  rawBody: string;
  headers: Record<string, string>;
  secret: string;
  expectedQuickProductId: string;
  repository: PolarEntitlementRepository;
  verifyEvent?: typeof validateEvent;
}): Promise<PolarWebhookProcessResult> {
  const verifyEvent = input.verifyEvent ?? validateEvent;
  const event = verifyEvent(input.rawBody, input.headers, input.secret);
  const eventId = getEventId(input.headers);
  const payloadSha256 = createHash("sha256").update(input.rawBody).digest("hex");

  if (event.type === "order.paid") {
    const metadata = assertPaidOrder(event, input.expectedQuickProductId);
    const repositoryResult = await input.repository.grantPaidOrder({
      eventId,
      eventType: event.type,
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
      eventType: event.type,
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
