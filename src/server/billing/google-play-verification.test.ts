import { describe, expect, it, vi } from "vitest";
import {
  GooglePlayVerificationError,
  hashPurchaseToken,
  processGooglePlayPurchase,
  type GooglePlayEntitlementRepository,
  type GooglePlayPurchase,
} from "./google-play-verification";

const analysisRunId = "22222222-2222-4222-8222-222222222222";
const applicationCaseId = "11111111-1111-4111-8111-111111111111";
const otherCaseId = "33333333-3333-4333-8333-333333333333";
const userId = "44444444-4444-4444-8444-444444444444";
// index 0 = base product, index n = n extra blocks — see
// GooglePlayConfiguration.productIds in google-play-checkout.ts.
const expectedProductIds = {
  QUICK: ["quick_1", "quick_extra_1", "", ""],
  PRO: ["pro_1", "", "", ""],
  FINAL: ["", "", "", ""],
};

function repository(overrides: Partial<GooglePlayEntitlementRepository> = {}) {
  return {
    grantPaidOrder: vi.fn().mockResolvedValue("GRANTED"),
    findExistingGrant: vi.fn().mockResolvedValue(null),
    ...overrides,
  } satisfies GooglePlayEntitlementRepository;
}

function purchased(overrides: Partial<GooglePlayPurchase> = {}): GooglePlayPurchase {
  return { purchaseState: 0, orderId: "GPA.1234-5678", acknowledgementState: 1, regionCode: "KR", ...overrides };
}

function context(product: "QUICK" | "PRO" | "FINAL" = "QUICK", totalCharacters = 5_000) {
  return vi.fn().mockResolvedValue({ data: { analysisRunId, applicationCaseId, product, totalCharacters }, error: null });
}

function baseInput(overrides: Partial<Parameters<typeof processGooglePlayPurchase>[0]> = {}) {
  return {
    rawRequest: { analysisRunId, purchaseToken: "token-1", productId: "quick_1" },
    currentUserId: userId,
    loadRunCaseId: vi.fn().mockResolvedValue(applicationCaseId),
    loadContext: context(),
    expectedProductIds,
    fetchPurchase: vi.fn().mockResolvedValue(purchased()),
    acknowledgePurchase: vi.fn().mockResolvedValue(undefined),
    repository: repository(),
    ...overrides,
  };
}

describe("Google Play purchase verification", () => {
  it("grants an entitlement for a verified purchase within the included character limit", async () => {
    const input = baseInput();

    const result = await processGooglePlayPurchase(input);

    expect(result).toMatchObject({ repositoryResult: "GRANTED", consumable: true });
    expect(result.quote).toMatchObject({ productTier: "QUICK", extraBlocks: 0, includedCharacters: 8_000 });
    expect(input.repository.grantPaidOrder).toHaveBeenCalledWith(expect.objectContaining({
      providerOrderId: "GPA.1234-5678",
      applicationCaseId,
      product: "QUICK",
      allowedCharacters: 8_000,
      currency: "krw",
      metadata: expect.objectContaining({ purchaseTokenSha256: hashPurchaseToken("token-1"), regionCode: "KR" }),
    }));
    // The token itself never goes into the ledger.
    expect(JSON.stringify((input.repository.grantPaidOrder as ReturnType<typeof vi.fn>).mock.calls[0][0].metadata)).not.toContain("token-1");
    expect(input.acknowledgePurchase).not.toHaveBeenCalled();
  });

  it("acknowledges the purchase before granting when Play has not acknowledged it yet", async () => {
    const order: string[] = [];
    const input = baseInput({
      fetchPurchase: vi.fn().mockResolvedValue(purchased({ acknowledgementState: 0 })),
      acknowledgePurchase: vi.fn().mockImplementation(async () => { order.push("ack"); }),
      repository: repository({ grantPaidOrder: vi.fn().mockImplementation(async () => { order.push("grant"); return "GRANTED"; }) }),
    });

    await processGooglePlayPurchase(input);

    expect(input.acknowledgePurchase).toHaveBeenCalledWith("quick_1", "token-1");
    expect(order).toEqual(["ack", "grant"]);
  });

  it("grants the full extra-block allowance when the ladder has a product for it", async () => {
    const input = baseInput({
      rawRequest: { analysisRunId, purchaseToken: "token-1", productId: "quick_extra_1" },
      loadContext: context("QUICK", 13_000),
    });

    const result = await processGooglePlayPurchase(input);

    expect(result.quote).toMatchObject({ extraBlocks: 1, allowedCharacters: 15_000, totalPriceKrw: 8_800 });
    expect(input.fetchPurchase).toHaveBeenCalledWith("quick_extra_1", "token-1");
    expect(input.repository.grantPaidOrder).toHaveBeenCalledWith(expect.objectContaining({
      allowedCharacters: 15_000,
      amount: 8_800,
    }));
  });

  it("refuses a document whose tier/extra-block combination has no Play product configured for it", async () => {
    // PRO's ladder only has a base product, so a 35,000자 PRO document (1 extra
    // block) must be refused rather than granted a smaller allowance.
    const input = baseInput({
      rawRequest: { analysisRunId, purchaseToken: "token-1", productId: "pro_1" },
      loadContext: context("PRO", 35_000),
    });

    const failure = processGooglePlayPurchase(input);
    await expect(failure).rejects.toMatchObject({ code: "GOOGLE_PLAY_TIER_UNSUPPORTED", consumable: false });
    // Inside the Play app the message must not steer the buyer to web checkout.
    await expect(failure).rejects.not.toThrow(/웹 브라우저/);
    expect(input.fetchPurchase).not.toHaveBeenCalled();
    expect(input.repository.grantPaidOrder).not.toHaveBeenCalled();
  });

  it("rejects a product id that does not match what the server expects for this tier", async () => {
    const input = baseInput({ rawRequest: { analysisRunId, purchaseToken: "token-1", productId: "wrong_product" } });
    await expect(processGooglePlayPurchase(input)).rejects.toBeInstanceOf(GooglePlayVerificationError);
    expect(input.repository.grantPaidOrder).not.toHaveBeenCalled();
  });

  it("reports a pending purchase as pending, without acknowledging, granting or allowing consumption", async () => {
    const input = baseInput({ fetchPurchase: vi.fn().mockResolvedValue(purchased({ purchaseState: 2, acknowledgementState: 0 })) });
    await expect(processGooglePlayPurchase(input)).rejects.toMatchObject({ code: "GOOGLE_PLAY_PENDING", consumable: false });
    expect(input.acknowledgePurchase).not.toHaveBeenCalled();
    expect(input.repository.grantPaidOrder).not.toHaveBeenCalled();
  });

  it("rejects a cancelled purchase", async () => {
    const input = baseInput({ fetchPurchase: vi.fn().mockResolvedValue(purchased({ purchaseState: 1 })) });
    await expect(processGooglePlayPurchase(input)).rejects.toMatchObject({ code: "GOOGLE_PLAY_NOT_PURCHASED", consumable: false });
    expect(input.repository.grantPaidOrder).not.toHaveBeenCalled();
  });

  it.each([["US"], [null]])("refuses a purchase from storefront %s before acknowledging it", async (regionCode) => {
    const input = baseInput({ fetchPurchase: vi.fn().mockResolvedValue(purchased({ regionCode, acknowledgementState: 0 })) });
    await expect(processGooglePlayPurchase(input)).rejects.toMatchObject({ code: "GOOGLE_PLAY_REGION_UNSUPPORTED", consumable: false });
    expect(input.acknowledgePurchase).not.toHaveBeenCalled();
    expect(input.repository.grantPaidOrder).not.toHaveBeenCalled();
  });

  it("stops before calling Play when the owned context cannot be prepared", async () => {
    const input = baseInput({ loadContext: vi.fn().mockResolvedValue({ data: null, error: { code: "55000", message: "CHECKOUT_NOT_ALLOWED" } }) });
    await expect(processGooglePlayPurchase(input)).rejects.toMatchObject({ consumable: false });
    expect(input.fetchPurchase).not.toHaveBeenCalled();
  });

  it("answers a retried token for the same application case as already granted, so the app may finish it", async () => {
    // The run already holds its entitlement, so preparing checkout would fail
    // with ACTIVE_ENTITLEMENT_EXISTS — the retry must not get that far.
    const input = baseInput({
      loadContext: vi.fn().mockResolvedValue({ data: null, error: { code: "55000", message: "ACTIVE_ENTITLEMENT_EXISTS" } }),
      repository: repository({ findExistingGrant: vi.fn().mockResolvedValue({ applicationCaseId, ownerUserId: userId }) }),
    });

    await expect(processGooglePlayPurchase(input)).resolves.toMatchObject({ repositoryResult: "ALREADY_GRANTED", consumable: true });
    expect(input.repository.findExistingGrant).toHaveBeenCalledWith({ purchaseTokenSha256: hashPurchaseToken("token-1"), providerOrderId: null });
    expect(input.loadContext).not.toHaveBeenCalled();
    expect(input.fetchPurchase).not.toHaveBeenCalled();
    expect(input.repository.grantPaidOrder).not.toHaveBeenCalled();
  });

  it.each([
    ["a different application case", { applicationCaseId: otherCaseId, ownerUserId: userId }],
    ["a different account", { applicationCaseId, ownerUserId: "55555555-5555-4555-8555-555555555555" }],
  ])("refuses to apply one purchase to %s twice", async (_label, grant) => {
    const input = baseInput({ repository: repository({ findExistingGrant: vi.fn().mockResolvedValue(grant) }) });
    await expect(processGooglePlayPurchase(input)).rejects.toMatchObject({ code: "GOOGLE_PLAY_PURCHASE_ALREADY_APPLIED", consumable: true });
    expect(input.repository.grantPaidOrder).not.toHaveBeenCalled();
  });

  it("resolves a concurrent duplicate grant through the winning order", async () => {
    const findExistingGrant = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ applicationCaseId, ownerUserId: userId });
    const input = baseInput({ repository: repository({ grantPaidOrder: vi.fn().mockResolvedValue("DUPLICATE_EVENT"), findExistingGrant }) });

    await expect(processGooglePlayPurchase(input)).resolves.toMatchObject({ repositoryResult: "ALREADY_GRANTED", consumable: true });
    expect(findExistingGrant).toHaveBeenLastCalledWith({ purchaseTokenSha256: hashPurchaseToken("token-1"), providerOrderId: "GPA.1234-5678" });
  });

  it("does not allow consumption when a duplicate cannot be traced to an order", async () => {
    const input = baseInput({ repository: repository({ grantPaidOrder: vi.fn().mockResolvedValue("DUPLICATE_ORDER") }) });
    await expect(processGooglePlayPurchase(input)).rejects.toMatchObject({ code: "GOOGLE_PLAY_DUPLICATE_ORDER", consumable: false });
  });
});
