import { describe, expect, it, vi } from "vitest";
import { createQuickCheckoutQuote, toQuickCheckoutMetadata } from "@/domain/usage-entitlement";
import type { PolarEntitlementRepository } from "./polar-webhook";
import { processPolarWebhook } from "./polar-webhook";

const caseId = "11111111-1111-4111-8111-111111111111";
const quote = createQuickCheckoutQuote(8_000);
const metadata = toQuickCheckoutMetadata(quote, caseId);

function repository(): PolarEntitlementRepository {
  return {
    grantPaidOrder: vi.fn().mockResolvedValue("GRANTED"),
    refundOrder: vi.fn((input: { requiresReview: boolean }) =>
      Promise.resolve(input.requiresReview ? "REVIEW_REQUIRED" : "REVOKED"),
    ),
  };
}

function paidEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: "order.paid",
    timestamp: new Date("2026-08-17T00:00:00.000Z"),
    data: {
      id: "order-1",
      paid: true,
      status: "paid",
      productId: "product-quick",
      checkoutId: "checkout-1",
      currency: "krw",
      netAmount: quote.totalPriceKrw,
      totalAmount: quote.totalPriceKrw,
      metadata,
      ...overrides,
    },
  };
}

const headers = { "webhook-id": "event-1" };

describe("Polar webhook entitlement processing", () => {
  it("grants a verified paid order without forwarding candidate text", async () => {
    const store = repository();
    const result = await processPolarWebhook({
      rawBody: "{signed payload}",
      headers,
      secret: "secret",
      expectedQuickProductId: "product-quick",
      repository: store,
      verifyEvent: vi.fn(() => paidEvent() as never),
    });

    expect(result).toEqual({
      disposition: "PROCESSED",
      eventType: "order.paid",
      repositoryResult: "GRANTED",
    });
    expect(store.grantPaidOrder).toHaveBeenCalledWith(expect.objectContaining({
      eventId: "event-1",
      providerOrderId: "order-1",
      applicationCaseId: caseId,
      allowedCharacters: quote.allowedCharacters,
      amount: quote.totalPriceKrw,
    }));
    expect(JSON.stringify(vi.mocked(store.grantPaidOrder).mock.calls)).not.toContain("signed payload");
  });

  it.each([
    ["wrong product", { productId: "other-product" }, "POLAR_PRODUCT_MISMATCH"],
    ["wrong currency", { currency: "usd" }, "POLAR_CURRENCY_MISMATCH"],
    ["wrong amount", { totalAmount: 1 }, "POLAR_ORDER_AMOUNT_MISMATCH"],
    ["not paid", { paid: false }, "POLAR_ORDER_NOT_PAID"],
  ])("rejects %s", async (_name, overrides, message) => {
    await expect(processPolarWebhook({
      rawBody: "{}",
      headers,
      secret: "secret",
      expectedQuickProductId: "product-quick",
      repository: repository(),
      verifyEvent: vi.fn(() => paidEvent(overrides) as never),
    })).rejects.toThrow(message);
  });

  it("rejects tampered entitlement metadata", async () => {
    await expect(processPolarWebhook({
      rawBody: "{}",
      headers,
      secret: "secret",
      expectedQuickProductId: "product-quick",
      repository: repository(),
      verifyEvent: vi.fn(() => paidEvent({
        metadata: { ...metadata, allowedCharacters: 999_999 },
      }) as never),
    })).rejects.toThrow("POLAR_METADATA_QUOTE_MISMATCH");
  });

  it("does not automatically revoke an entitlement for a partial refund", async () => {
    const store = repository();
    const result = await processPolarWebhook({
      rawBody: "{}",
      headers,
      secret: "secret",
      expectedQuickProductId: "product-quick",
      repository: store,
      verifyEvent: vi.fn(() => ({
        type: "order.refunded",
        timestamp: new Date("2026-08-17T01:00:00.000Z"),
        data: { id: "order-1", refundedAmount: 1_000, netAmount: 4_900 },
      }) as never),
    });

    expect(result).toMatchObject({
      disposition: "PROCESSED",
      repositoryResult: "REVIEW_REQUIRED",
    });
    expect(store.refundOrder).toHaveBeenCalledWith(expect.objectContaining({ requiresReview: true }));
  });

  it("revokes an unused entitlement after a full refund", async () => {
    const store = repository();
    const result = await processPolarWebhook({
      rawBody: "{}",
      headers,
      secret: "secret",
      expectedQuickProductId: "product-quick",
      repository: store,
      verifyEvent: vi.fn(() => ({
        type: "order.refunded",
        timestamp: new Date("2026-08-17T01:00:00.000Z"),
        data: { id: "order-1", refundedAmount: 4_900, netAmount: 4_900 },
      }) as never),
    });

    expect(result).toMatchObject({
      disposition: "PROCESSED",
      repositoryResult: "REVOKED",
    });
    expect(store.refundOrder).toHaveBeenCalledOnce();
    expect(store.refundOrder).toHaveBeenCalledWith(expect.objectContaining({ requiresReview: false }));
  });
});
