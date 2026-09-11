import { describe, expect, it, vi } from "vitest";
import {
  GooglePlayVerificationError,
  processGooglePlayPurchase,
  type GooglePlayEntitlementRepository,
  type GooglePlayPurchase,
} from "./google-play-verification";

const analysisRunId = "22222222-2222-4222-8222-222222222222";
const applicationCaseId = "11111111-1111-4111-8111-111111111111";
// index 0 = base product, index n = n extra blocks — see
// GooglePlayConfiguration.productIds in google-play-checkout.ts.
const expectedProductIds = {
  QUICK: ["quick_1", "quick_extra_1", "", ""],
  PRO: ["pro_1", "", "", ""],
  FINAL: ["", "", "", ""],
};

function repository(): GooglePlayEntitlementRepository {
  return { grantPaidOrder: vi.fn().mockResolvedValue("GRANTED") };
}

function purchased(overrides: Partial<GooglePlayPurchase> = {}): GooglePlayPurchase {
  return { purchaseState: 0, orderId: "GPA.1234-5678", acknowledgementState: 1, ...overrides };
}

describe("Google Play purchase verification", () => {
  it("grants an entitlement for a verified purchase within the included character limit", async () => {
    const repo = repository();
    const fetchPurchase = vi.fn().mockResolvedValue(purchased());
    const acknowledgePurchase = vi.fn();

    const result = await processGooglePlayPurchase({
      rawRequest: { analysisRunId, purchaseToken: "token-1", productId: "quick_1" },
      loadContext: vi.fn().mockResolvedValue({
        data: { analysisRunId, applicationCaseId, product: "QUICK", totalCharacters: 5_000 },
        error: null,
      }),
      expectedProductIds,
      fetchPurchase,
      acknowledgePurchase,
      repository: repo,
    });

    expect(result.quote).toMatchObject({ productTier: "QUICK", extraBlocks: 0, includedCharacters: 8_000 });
    expect(repo.grantPaidOrder).toHaveBeenCalledWith(expect.objectContaining({
      providerOrderId: "GPA.1234-5678",
      applicationCaseId,
      product: "QUICK",
      allowedCharacters: 8_000,
      currency: "krw",
    }));
    expect(acknowledgePurchase).not.toHaveBeenCalled();
  });

  it("acknowledges the purchase before granting when Play has not acknowledged it yet", async () => {
    const repo = repository();
    const acknowledgePurchase = vi.fn().mockResolvedValue(undefined);

    await processGooglePlayPurchase({
      rawRequest: { analysisRunId, purchaseToken: "token-1", productId: "quick_1" },
      loadContext: vi.fn().mockResolvedValue({
        data: { analysisRunId, applicationCaseId, product: "QUICK", totalCharacters: 5_000 },
        error: null,
      }),
      expectedProductIds,
      fetchPurchase: vi.fn().mockResolvedValue(purchased({ acknowledgementState: 0 })),
      acknowledgePurchase,
      repository: repo,
    });

    expect(acknowledgePurchase).toHaveBeenCalledWith("quick_1", "token-1");
    expect(repo.grantPaidOrder).toHaveBeenCalled();
  });

  it("grants the full extra-block allowance when the ladder has a product for it", async () => {
    const repo = repository();
    const fetchPurchase = vi.fn().mockResolvedValue(purchased());

    const result = await processGooglePlayPurchase({
      rawRequest: { analysisRunId, purchaseToken: "token-1", productId: "quick_extra_1" },
      loadContext: vi.fn().mockResolvedValue({
        data: { analysisRunId, applicationCaseId, product: "QUICK", totalCharacters: 13_000 },
        error: null,
      }),
      expectedProductIds,
      fetchPurchase,
      acknowledgePurchase: vi.fn(),
      repository: repo,
    });

    expect(result.quote).toMatchObject({ extraBlocks: 1, allowedCharacters: 15_000, totalPriceKrw: 8_800 });
    expect(fetchPurchase).toHaveBeenCalledWith("quick_extra_1", "token-1");
    expect(repo.grantPaidOrder).toHaveBeenCalledWith(expect.objectContaining({
      allowedCharacters: 15_000,
      amount: 8_800,
    }));
  });

  it("refuses a document whose tier/extra-block combination has no Play product configured for it", async () => {
    const repo = repository();
    const fetchPurchase = vi.fn();

    // PRO's ladder (expectedProductIds.PRO) only has a base product — no
    // extra-block rung — so a 35,000자 PRO document (1 extra block) must be
    // refused rather than granted a smaller allowance than it needs.
    await expect(processGooglePlayPurchase({
      rawRequest: { analysisRunId, purchaseToken: "token-1", productId: "pro_1" },
      loadContext: vi.fn().mockResolvedValue({
        data: { analysisRunId, applicationCaseId, product: "PRO", totalCharacters: 35_000 },
        error: null,
      }),
      expectedProductIds,
      fetchPurchase,
      acknowledgePurchase: vi.fn(),
      repository: repo,
    })).rejects.toMatchObject({ code: "GOOGLE_PLAY_TIER_UNSUPPORTED" });

    expect(fetchPurchase).not.toHaveBeenCalled();
    expect(repo.grantPaidOrder).not.toHaveBeenCalled();
  });

  it("rejects a product id that does not match what the server expects for this tier", async () => {
    const repo = repository();
    await expect(processGooglePlayPurchase({
      rawRequest: { analysisRunId, purchaseToken: "token-1", productId: "wrong_product" },
      loadContext: vi.fn().mockResolvedValue({
        data: { analysisRunId, applicationCaseId, product: "QUICK", totalCharacters: 5_000 },
        error: null,
      }),
      expectedProductIds,
      fetchPurchase: vi.fn(),
      acknowledgePurchase: vi.fn(),
      repository: repo,
    })).rejects.toBeInstanceOf(GooglePlayVerificationError);
    expect(repo.grantPaidOrder).not.toHaveBeenCalled();
  });

  it("rejects an unpurchased or pending purchase state instead of granting anything", async () => {
    const repo = repository();
    await expect(processGooglePlayPurchase({
      rawRequest: { analysisRunId, purchaseToken: "token-1", productId: "quick_1" },
      loadContext: vi.fn().mockResolvedValue({
        data: { analysisRunId, applicationCaseId, product: "QUICK", totalCharacters: 5_000 },
        error: null,
      }),
      expectedProductIds,
      fetchPurchase: vi.fn().mockResolvedValue(purchased({ purchaseState: 2 })),
      acknowledgePurchase: vi.fn(),
      repository: repo,
    })).rejects.toMatchObject({ code: "GOOGLE_PLAY_NOT_PURCHASED" });
    expect(repo.grantPaidOrder).not.toHaveBeenCalled();
  });

  it("stops before calling Play when the owned context cannot be prepared", async () => {
    const repo = repository();
    const fetchPurchase = vi.fn();
    await expect(processGooglePlayPurchase({
      rawRequest: { analysisRunId, purchaseToken: "token-1", productId: "quick_1" },
      loadContext: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "55000", message: "ACTIVE_ENTITLEMENT_EXISTS" },
      }),
      expectedProductIds,
      fetchPurchase,
      acknowledgePurchase: vi.fn(),
      repository: repo,
    })).rejects.toBeInstanceOf(GooglePlayVerificationError);
    expect(fetchPurchase).not.toHaveBeenCalled();
  });
});
