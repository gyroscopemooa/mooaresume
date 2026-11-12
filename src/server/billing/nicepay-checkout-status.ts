import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getNicepayPaymentConfig, recoverNicepayOrder } from "./nicepay-payment-service";
import { SupabaseNicepayOrderRepository } from "./nicepay-order-repository";
import { NicepayGateway } from "./nicepay-protocol";

export async function getNicepayCheckoutStatus(checkoutId: string, ownerId: string) {
  if (!process.env.NICEPAY_MID) return null;
  const repo = new SupabaseNicepayOrderRepository();
  let order = await repo.loadById(checkoutId, ownerId);
  if (!order) return null;
  if (["AUTHORIZING", "REVIEW_REQUIRED"].includes(order.status)) {
    await recoverNicepayOrder(order, repo, new NicepayGateway(getNicepayPaymentConfig()));
    order = await repo.loadById(checkoutId, ownerId);
    if (!order) return null;
  }
  const client = await createClient();
  const { data: run, error } = await client.from("analysis_runs").select("id,status,product").eq("id", order.analysis_run_id).eq("owner_user_id", ownerId).maybeSingle();
  if (error || !run) throw new Error("NICEPAY_ANALYSIS_STATUS_FAILED");
  const [{ data: entitlement }, { data: result }] = await Promise.all([
    order.billing_order_id ? client.from("analysis_entitlements").select("status").eq("billing_order_id", order.billing_order_id).eq("owner_user_id", ownerId).maybeSingle() : Promise.resolve({ data: null }),
    client.from("analysis_results").select("id").eq("analysis_run_id", order.analysis_run_id).eq("owner_user_id", ownerId).limit(1).maybeSingle(),
  ]);
  return { checkoutId: order.id, provider: "NICEPAY", analysisRunId: order.analysis_run_id,
    checkoutStatus: ["PAID", "REFUNDED"].includes(order.status) ? "SUCCEEDED" : ["FAILED", "EXPIRED", "NET_CANCELLED"].includes(order.status) ? "EXPIRED" : "OPEN",
    analysisStatus: run.status, product: order.product, entitlementStatus: entitlement?.status ?? null, hasResult: !!result };
}
