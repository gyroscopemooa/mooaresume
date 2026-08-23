import { describe, expect, it, vi } from "vitest";
import { createCheckoutQuote, createQuickCheckoutQuote, toCheckoutMetadata, toQuickCheckoutMetadata } from "@/domain/usage-entitlement";
import type { PolarEntitlementRepository } from "./polar-webhook";
import { processPolarWebhook } from "./polar-webhook";

const caseId = "11111111-1111-4111-8111-111111111111";
const quote = createQuickCheckoutQuote(8_000);
const metadata = toQuickCheckoutMetadata(quote, caseId);
const proQuote = createCheckoutQuote("PRO", 20_000);
const proMetadata = toCheckoutMetadata(proQuote, caseId);

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
      expectedProductIds: { QUICK: "product-quick", PRO: "product-pro" },
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

  it("grants a verified PRO paid order using the PRO product id and quote", async () => {
    const store = repository();
    const result = await processPolarWebhook({
      rawBody: "{}",
      headers,
      secret: "secret",
      expectedProductIds: { QUICK: "product-quick", PRO: "product-pro" },
      repository: store,
      verifyEvent: vi.fn(() => paidEvent({
        productId: "product-pro",
        netAmount: proQuote.totalPriceKrw,
        totalAmount: proQuote.totalPriceKrw,
        metadata: proMetadata,
      }) as never),
    });

    expect(result).toEqual({
      disposition: "PROCESSED",
      eventType: "order.paid",
      repositoryResult: "GRANTED",
    });
    expect(store.grantPaidOrder).toHaveBeenCalledWith(expect.objectContaining({
      product: "PRO",
      applicationCaseId: caseId,
      allowedCharacters: proQuote.allowedCharacters,
      amount: proQuote.totalPriceKrw,
    }));
  });

  it("rejects a PRO order charged against the QUICK product id", async () => {
    await expect(processPolarWebhook({
      rawBody: "{}",
      headers,
      secret: "secret",
      expectedProductIds: { QUICK: "product-quick", PRO: "product-pro" },
      repository: repository(),
      verifyEvent: vi.fn(() => paidEvent({
        productId: "product-quick",
        netAmount: proQuote.totalPriceKrw,
        totalAmount: proQuote.totalPriceKrw,
        metadata: proMetadata,
      }) as never),
    })).rejects.toThrow("POLAR_PRODUCT_MISMATCH");
  });

  it("accepts a paid order delivered as order.updated", async () => {
    const result = await processPolarWebhook({
      rawBody: "{}",
      headers,
      secret: "secret",
      expectedProductIds: { QUICK: "product-quick", PRO: "product-pro" },
      repository: repository(),
      verifyEvent: vi.fn(() => ({ ...paidEvent(), type: "order.updated" }) as never),
    });
    expect(result).toMatchObject({ disposition: "PROCESSED", eventType: "order.updated", repositoryResult: "GRANTED" });
  });

  it("accepts a paid order with a Polar discount", async () => {
    const result = await processPolarWebhook({
      rawBody: "{}",
      headers,
      secret: "secret",
      expectedProductIds: { QUICK: "product-quick", PRO: "product-pro" },
      repository: repository(),
      verifyEvent: vi.fn(() => paidEvent({ totalAmount: quote.totalPriceKrw - 1_000, discountId: "discount-1" }) as never),
    });
    expect(result).toMatchObject({ disposition: "PROCESSED", repositoryResult: "GRANTED" });
  });

  it("accepts a fully discounted (100% off) paid order at zero amount", async () => {
    const result = await processPolarWebhook({
      rawBody: "{}",
      headers,
      secret: "secret",
      expectedProductIds: { QUICK: "product-quick", PRO: "product-pro" },
      repository: repository(),
      verifyEvent: vi.fn(() => paidEvent({ totalAmount: 0, discountId: "discount-100" }) as never),
    });
    expect(result).toMatchObject({ disposition: "PROCESSED", repositoryResult: "GRANTED" });
  });

  it.each([
    ["wrong product", { productId: "other-product" }, "POLAR_PRODUCT_MISMATCH"],
    ["wrong currency", { currency: "usd" }, "POLAR_CURRENCY_MISMATCH"],
    ["wrong amount", { totalAmount: 1 }, "POLAR_ORDER_AMOUNT_MISMATCH"],
    ["zero amount with no discount", { totalAmount: 0 }, "POLAR_ORDER_AMOUNT_MISMATCH"],
    ["not paid", { paid: false }, "POLAR_ORDER_NOT_PAID"],
  ])("rejects %s", async (_name, overrides, message) => {
    await expect(processPolarWebhook({
      rawBody: "{}",
      headers,
      secret: "secret",
      expectedProductIds: { QUICK: "product-quick", PRO: "product-pro" },
      repository: repository(),
      verifyEvent: vi.fn(() => paidEvent(overrides) as never),
    })).rejects.toThrow(message);
  });

  it("rejects tampered entitlement metadata", async () => {
    await expect(processPolarWebhook({
      rawBody: "{}",
      headers,
      secret: "secret",
      expectedProductIds: { QUICK: "product-quick", PRO: "product-pro" },
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
      expectedProductIds: { QUICK: "product-quick", PRO: "product-pro" },
      repository: store,
      verifyEvent: vi.fn(() => ({
        type: "order.refunded",
        timestamp: new Date("2026-08-17T01:00:00.000Z"),
        data: { id: "order-1", refundedAmount: 1_000, netAmount: 5_900 },
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
      expectedProductIds: { QUICK: "product-quick", PRO: "product-pro" },
      repository: store,
      verifyEvent: vi.fn(() => ({
        type: "order.refunded",
        timestamp: new Date("2026-08-17T01:00:00.000Z"),
        data: { id: "order-1", refundedAmount: 5_900, netAmount: 5_900 },
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
