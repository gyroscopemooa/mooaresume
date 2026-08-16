import { describe, expect, it, vi } from "vitest";
import { createQuickCheckoutQuote, toQuickCheckoutMetadata } from "@/domain/usage-entitlement";
import { PolarSdkCheckoutGateway } from "./polar-checkout";

describe("Polar SDK checkout gateway", () => {
  it("creates a KRW inclusive checkout with server-owned price and metadata", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "checkout-1",
      url: "https://sandbox.polar.sh/checkout/checkout-1",
      expiresAt: new Date("2026-08-17T01:00:00.000Z"),
    });
    const quote = createQuickCheckoutQuote(13_000);
    const metadata = toQuickCheckoutMetadata(
      quote,
      "11111111-1111-4111-8111-111111111111",
    );
    const gateway = new PolarSdkCheckoutGateway(
      { checkouts: { create } } as never,
      "product-quick",
    );

    const result = await gateway.createCheckout({
      quote,
      metadata,
      successUrl: "https://example.com/analysis/prepare?checkout=success",
      returnUrl: "https://example.com/analysis/prepare",
      externalCustomerId: "user-1",
      customerEmail: "user@example.com",
      customerIpAddress: "203.0.113.10",
    });

    expect(result).toEqual({
      checkoutId: "checkout-1",
      checkoutUrl: "https://sandbox.polar.sh/checkout/checkout-1",
      expiresAt: "2026-08-17T01:00:00.000Z",
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      products: ["product-quick"],
      prices: {
        "product-quick": [{
          amountType: "fixed",
          priceCurrency: "krw",
          priceAmount: quote.totalPriceKrw,
          taxBehavior: "inclusive",
        }],
      },
      metadata: expect.objectContaining({
        applicationCaseId: metadata.applicationCaseId,
        allowedCharacters: quote.allowedCharacters,
      }),
      externalCustomerId: "user-1",
      allowDiscountCodes: false,
      allowTrial: false,
      currency: "krw",
      locale: "ko-KR",
    }), { timeoutMs: 10_000 });
  });
});
