import { describe, expect, it, vi } from "vitest";
import type { PolarCheckoutGateway } from "./polar-checkout";
import { createQuickCheckout, QuickCheckoutError } from "./quick-checkout-service";

const analysisRunId = "22222222-2222-4222-8222-222222222222";
const applicationCaseId = "11111111-1111-4111-8111-111111111111";

function gateway(): PolarCheckoutGateway {
  return {
    createCheckout: vi.fn().mockResolvedValue({
      checkoutId: "checkout-1",
      checkoutUrl: "https://sandbox.polar.sh/checkout/checkout-1",
      expiresAt: "2026-08-17T01:00:00.000Z",
    }),
  };
}

describe("QUICK checkout service", () => {
  it("loads trusted context and calculates price on the server", async () => {
    const polar = gateway();
    const result = await createQuickCheckout({
      rawRequest: { analysisRunId },
      loadContext: vi.fn().mockResolvedValue({
        data: { analysisRunId, applicationCaseId, totalCharacters: 13_000 },
        error: null,
      }),
      gateway: polar,
      user: { id: "user-1", email: "user@example.com" },
      successUrl: "https://example.com/success",
      returnUrl: "https://example.com/return",
    });

    expect(result.quote).toMatchObject({
      totalCharacters: 13_000,
      extraBlocks: 1,
      totalPriceKrw: 7_800,
    });
    expect(polar.createCheckout).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        applicationCaseId,
        totalCharacters: 13_000,
      }),
      externalCustomerId: "user-1",
    }));
  });

  it("does not accept a browser-supplied price or case id", async () => {
    const polar = gateway();
    await createQuickCheckout({
      rawRequest: {
        analysisRunId,
        totalPriceKrw: 1,
        applicationCaseId: "33333333-3333-4333-8333-333333333333",
      },
      loadContext: vi.fn().mockResolvedValue({
        data: { analysisRunId, applicationCaseId, totalCharacters: 1_000 },
        error: null,
      }),
      gateway: polar,
      user: { id: "user-1" },
      successUrl: "https://example.com/success",
      returnUrl: "https://example.com/return",
    });

    expect(polar.createCheckout).toHaveBeenCalledWith(expect.objectContaining({
      quote: expect.objectContaining({ totalPriceKrw: 4_900 }),
      metadata: expect.objectContaining({ applicationCaseId }),
    }));
  });

  it("stops before Polar when the owned context cannot be prepared", async () => {
    const polar = gateway();
    await expect(createQuickCheckout({
      rawRequest: { analysisRunId },
      loadContext: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "55000", message: "ACTIVE_ENTITLEMENT_EXISTS" },
      }),
      gateway: polar,
      user: { id: "user-1" },
      successUrl: "https://example.com/success",
      returnUrl: "https://example.com/return",
    })).rejects.toBeInstanceOf(QuickCheckoutError);
    expect(polar.createCheckout).not.toHaveBeenCalled();
  });
});
