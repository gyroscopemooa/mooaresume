import "server-only";
import { getNicepayPaymentConfig } from "./nicepay-payment-service";
import { createNicepayServiceClient, nicepayOrderSchema, SupabaseNicepayOrderRepository } from "./nicepay-order-repository";
import { nicepayDigest, NicepayGateway } from "./nicepay-protocol";

/** Call only after the shared billing-order refund claim has been acquired. */
export async function refundNicepayBillingOrder(input: {
  billingOrderId: string; providerOrderId: string; ownerUserId: string; amount: number; currency: string; analysisRunId?: string;
}) {
  const { data, error } = await createNicepayServiceClient().from("nicepay_orders").select("*")
    .eq("tid", input.providerOrderId).eq("owner_user_id", input.ownerUserId).eq("billing_order_id", input.billingOrderId).single();
  if (error) throw new Error("NICEPAY_REFUND_ORDER_NOT_FOUND");
  const order = nicepayOrderSchema.parse(data);
  if (order.amount !== input.amount || order.currency !== input.currency.toLowerCase()
    || (input.analysisRunId && order.analysis_run_id !== input.analysisRunId)) throw new Error("NICEPAY_REFUND_BINDING_INVALID");
  const gateway = new NicepayGateway(getNicepayPaymentConfig());
  const proof = await gateway.cancel(order);
  const entitlementsRevoked = await new SupabaseNicepayOrderRepository().completeCancel(order.id, proof.CancelNum ?? order.tid!, nicepayDigest(JSON.stringify(proof)));
  return { disposition: "REFUNDED" as const, amount: order.amount, currency: order.currency, entitlementsRevoked };
}
