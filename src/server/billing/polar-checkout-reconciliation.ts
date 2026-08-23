import "server-only";

import { createHash } from "node:crypto";
import { Polar } from "@polar-sh/sdk";
import type { ProductTier } from "@/domain/usage-entitlement";
import { getPolarCheckoutConfiguration } from "@/server/billing/polar-checkout";
import {
  validatePolarPaidOrder,
  type PolarEntitlementRepository,
  type PolarEnvironment,
  type PolarPaidOrder,
} from "@/server/billing/polar-webhook";

type ReconciliationCheckout = {
  id: string;
  status: string;
  externalCustomerId: string | null;
  productId: string | null;
};

type ReconciliationOrder = PolarPaidOrder & {
  id: string;
  checkoutId: string | null;
  createdAt: Date;
  modifiedAt: Date | null;
};

export type PolarCheckoutReconciliationGateway = {
  getCheckout(checkoutId: string): Promise<ReconciliationCheckout>;
  listOrders(checkoutId: string): Promise<ReconciliationOrder[]>;
};

export type PolarCheckoutReconciliationResult =
  | { disposition: "PENDING"; checkoutStatus: string }
  | { disposition: "RECOVERED"; repositoryResult: string };

export async function reconcilePolarCheckout(input: {
  checkoutId: string;
  ownerUserId: string;
  applicationCaseId: string;
  product: ProductTier;
  expectedProductIds: Record<ProductTier, string>;
  /** Recorded with the order for the same reason as in the webhook path. */
  environment: PolarEnvironment;
  gateway: PolarCheckoutReconciliationGateway;
  repository: PolarEntitlementRepository;
}): Promise<PolarCheckoutReconciliationResult> {
  const checkout = await input.gateway.getCheckout(input.checkoutId);
  if (checkout.id !== input.checkoutId) throw new Error("POLAR_CHECKOUT_ID_MISMATCH");
  if (checkout.externalCustomerId !== input.ownerUserId) throw new Error("POLAR_CHECKOUT_OWNER_MISMATCH");
  if (checkout.productId !== input.expectedProductIds[input.product]) throw new Error("POLAR_PRODUCT_MISMATCH");
  if (checkout.status !== "succeeded") {
    return { disposition: "PENDING", checkoutStatus: checkout.status };
  }

  const orders = await input.gateway.listOrders(input.checkoutId);
  const order = orders.find((candidate) => candidate.paid && candidate.status === "paid");
  if (!order) return { disposition: "PENDING", checkoutStatus: checkout.status };
  if (order.checkoutId !== input.checkoutId) throw new Error("POLAR_ORDER_CHECKOUT_MISMATCH");

  const metadata = validatePolarPaidOrder(order, input.expectedProductIds);
  if (metadata.applicationCaseId !== input.applicationCaseId) throw new Error("POLAR_APPLICATION_CASE_MISMATCH");
  if (metadata.tier !== input.product) throw new Error("POLAR_ANALYSIS_PRODUCT_MISMATCH");

  const payloadSha256 = createHash("sha256").update(JSON.stringify({
    source: "checkout-return-reconciliation",
    checkoutId: input.checkoutId,
    orderId: order.id,
    amount: order.totalAmount,
    currency: order.currency.toLowerCase(),
  })).digest("hex");
  const repositoryResult = await input.repository.grantPaidOrder({
    eventId: `checkout-reconciliation:${order.id}`,
    eventType: "order.paid",
    payloadSha256,
    providerOrderId: order.id,
    providerCheckoutId: input.checkoutId,
    applicationCaseId: metadata.applicationCaseId,
    product: metadata.tier,
    allowedCharacters: metadata.allowedCharacters,
    amount: order.totalAmount,
    currency: order.currency.toLowerCase(),
    paidAt: (order.modifiedAt ?? order.createdAt).toISOString(),
    metadata: {
      tier: metadata.tier,
      totalCharacters: metadata.totalCharacters,
      baseCharacters: metadata.baseCharacters,
      includedCharacters: metadata.includedCharacters,
      extraBlocks: metadata.extraBlocks,
      allowedCharacters: metadata.allowedCharacters,
      polarEnvironment: input.environment,
    },
  });

  return { disposition: "RECOVERED", repositoryResult };
}

export function createPolarCheckoutReconciliationRuntime() {
  const config = getPolarCheckoutConfiguration();
  const polar = new Polar({ accessToken: config.accessToken, server: config.server });
  const gateway: PolarCheckoutReconciliationGateway = {
    async getCheckout(checkoutId) {
      const checkout = await polar.checkouts.get({ id: checkoutId }, { timeoutMs: 10_000 });
      return {
        id: checkout.id,
        status: checkout.status,
        externalCustomerId: checkout.externalCustomerId,
        productId: checkout.productId,
      };
    },
    async listOrders(checkoutId) {
      const pages = await polar.orders.list({ checkoutId, limit: 10 }, { timeoutMs: 10_000 });
      for await (const page of pages) return page.result.items;
      return [];
    },
  };

  return {
    gateway,
    expectedProductIds: { QUICK: config.quickProductId, PRO: config.proProductId },
    environment: config.server,
  } as const;
}
