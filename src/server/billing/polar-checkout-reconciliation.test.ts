import { describe, expect, it, vi } from "vitest";
import { createQuickCheckoutQuote, toQuickCheckoutMetadata } from "@/domain/usage-entitlement";
import type { PolarEntitlementRepository } from "./polar-webhook";
import { reconcilePolarCheckout, type PolarCheckoutReconciliationGateway } from "./polar-checkout-reconciliation";

const ownerUserId = "11111111-1111-4111-8111-111111111111";
const applicationCaseId = "22222222-2222-4222-8222-222222222222";
const quote = createQuickCheckoutQuote(8_000);
const metadata = toQuickCheckoutMetadata(quote, applicationCaseId);
const expectedProductIds = { QUICK: "product-quick", PRO: "product-pro" } as const;

function repository(): PolarEntitlementRepository {
  return {
    grantPaidOrder: vi.fn().mockResolvedValue("GRANTED"),
    refundOrder: vi.fn().mockResolvedValue("REVOKED"),
  };
}

function gateway(overrides: { checkoutStatus?: string; owner?: string } = {}): PolarCheckoutReconciliationGateway {
  return {
    getCheckout: vi.fn().mockResolvedValue({
      id: "checkout-1",
      status: overrides.checkoutStatus ?? "succeeded",
      externalCustomerId: overrides.owner ?? ownerUserId,
      productId: "product-quick",
    }),
    listOrders: vi.fn().mockResolvedValue([{
      id: "order-1",
      checkoutId: "checkout-1",
      createdAt: new Date("2026-08-21T00:00:00.000Z"),
      modifiedAt: null,
      paid: true,
      status: "paid",
      productId: "product-quick",
      currency: "krw",
      totalAmount: quote.totalPriceKrw,
      discountId: null,
      metadata,
    }]),
  };
}

describe("Polar checkout return reconciliation", () => {
  it("recovers a verified paid order when the webhook was missed", async () => {
    const store = repository();
    await expect(reconcilePolarCheckout({
      checkoutId: "checkout-1",
      ownerUserId,
      applicationCaseId,
      product: "QUICK",
      expectedProductIds,
      environment: "production",
      gateway: gateway(),
      repository: store,
    })).resolves.toEqual({ disposition: "RECOVERED", repositoryResult: "GRANTED" });
    expect(store.grantPaidOrder).toHaveBeenCalledWith(expect.objectContaining({
      providerCheckoutId: "checkout-1",
      providerOrderId: "order-1",
      applicationCaseId,
      product: "QUICK",
      amount: quote.totalPriceKrw,
    }));
  });

  it("keeps waiting while Polar still reports an open checkout", async () => {
    const lookup = gateway({ checkoutStatus: "open" });
    const store = repository();
    await expect(reconcilePolarCheckout({
      checkoutId: "checkout-1",
      ownerUserId,
      applicationCaseId,
      product: "QUICK",
      expectedProductIds,
      environment: "production",
      gateway: lookup,
      repository: store,
    })).resolves.toEqual({ disposition: "PENDING", checkoutStatus: "open" });
    expect(lookup.listOrders).not.toHaveBeenCalled();
    expect(store.grantPaidOrder).not.toHaveBeenCalled();
  });

  it("rejects a checkout that belongs to another user", async () => {
    await expect(reconcilePolarCheckout({
      checkoutId: "checkout-1",
      ownerUserId,
      applicationCaseId,
      product: "QUICK",
      expectedProductIds,
      environment: "production",
      gateway: gateway({ owner: "33333333-3333-4333-8333-333333333333" }),
      repository: repository(),
    })).rejects.toThrow("POLAR_CHECKOUT_OWNER_MISMATCH");
  });
});
