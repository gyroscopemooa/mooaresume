import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checkoutQuoteSchema } from "@/domain/usage-entitlement";

export const nicepayOrderSchema = z.object({
  id: z.string().uuid(), moid: z.string(), owner_user_id: z.string().uuid(), application_case_id: z.string().uuid(),
  analysis_run_id: z.string().uuid(), product: z.enum(["QUICK", "PRO", "FINAL"]), method: z.enum(["CARD", "EASYPAY", "KAKAO"]),
  merchant_mid: z.string(), amount: z.number().int().positive(), currency: z.literal("krw"), pricing_version: z.string(),
  quote_snapshot: checkoutQuoteSchema, test_purchase: z.boolean(),
  status: z.enum(["OPEN", "AUTHORIZING", "PAID", "FAILED", "EXPIRED", "NET_CANCELLED", "REFUNDED", "REVIEW_REQUIRED"]),
  tid: z.string().nullable(), billing_order_id: z.string().uuid().nullable(), expires_at: z.string(),
});
export type NicepayOrder = z.infer<typeof nicepayOrderSchema>;

export function createNicepayServiceClient() {
  const url = z.string().url().parse(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = z.string().min(1).parse(process.env.SUPABASE_SECRET_KEY);
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
export interface NicepayOrderRepository {
  loadByMoid(moid: string): Promise<NicepayOrder | null>;
  claimApproval(id: string, tid: string, tokenHash: string): Promise<string>;
  grant(id: string, tid: string, proofHash: string): Promise<string>;
  mark(id: string, status: "FAILED" | "REVIEW_REQUIRED", failure: string): Promise<void>;
  completeCancel(id: string, reference: string, proofHash: string): Promise<number>;
  claimRecovery(id: string): Promise<boolean>;
}
export class SupabaseNicepayOrderRepository implements NicepayOrderRepository {
  constructor(private readonly client = createNicepayServiceClient()) {}
  async loadByMoid(moid: string) {
    const { data, error } = await this.client.from("nicepay_orders").select("*").eq("moid", moid).maybeSingle();
    if (error) throw new Error("NICEPAY_ORDER_READ_FAILED");
    return data ? nicepayOrderSchema.parse(data) : null;
  }
  async loadById(id: string, ownerId?: string) {
    let query = this.client.from("nicepay_orders").select("*").eq("id", id);
    if (ownerId) query = query.eq("owner_user_id", ownerId);
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error("NICEPAY_ORDER_READ_FAILED");
    return data ? nicepayOrderSchema.parse(data) : null;
  }
  async reserve(runId: string, ownerId: string, provider: "POLAR" | "NICEPAY") {
    const { error } = await this.client.rpc("reserve_checkout_provider", { p_run_id: runId, p_owner_id: ownerId, p_provider: provider });
    if (error) throw new Error(error.message.includes("CHECKOUT_PROVIDER_IN_PROGRESS") ? "CHECKOUT_PROVIDER_IN_PROGRESS" : "NICEPAY_RESERVATION_FAILED");
  }
  async create(input: { id: string; runId: string; ownerId: string; mid: string; method: NicepayOrder["method"]; quote: NicepayOrder["quote_snapshot"]; pricingVersion: string; test: boolean }) {
    const { data, error } = await this.client.rpc("create_nicepay_order", {
      p_id: input.id, p_run_id: input.runId, p_owner_id: input.ownerId, p_mid: input.mid, p_method: input.method,
      p_quote: input.quote, p_pricing_version: input.pricingVersion, p_test: input.test,
    });
    if (error) throw new Error("NICEPAY_ORDER_CREATE_FAILED");
    return nicepayOrderSchema.parse(data);
  }
  async claimApproval(id: string, tid: string, tokenHash: string) {
    const { data, error } = await this.client.rpc("claim_nicepay_approval", { p_id: id, p_tid: tid, p_token_sha256: tokenHash });
    if (error) throw new Error("NICEPAY_APPROVAL_CLAIM_FAILED");
    return z.string().parse(data);
  }
  async grant(id: string, tid: string, proofHash: string) {
    const { data, error } = await this.client.rpc("grant_nicepay_order", { p_id: id, p_tid: tid, p_proof_sha256: proofHash });
    if (error) throw new Error("NICEPAY_ENTITLEMENT_GRANT_FAILED");
    const outcome = z.enum(["GRANTED", "ALREADY_PAID", "CANCEL_REQUIRED"]).parse(data);
    if (outcome === "GRANTED") {
      // Referral trouble must never invalidate an already delivered purchase.
      try {
        const order = await this.loadById(id);
        if (order?.billing_order_id && !order.test_purchase) {
          const { error: referralError } = await this.client.rpc("settle_referral_for_order", { p_billing_order_id: order.billing_order_id });
          if (referralError) console.error("nicepay_referral_settlement_pending", { orderId: id });
        }
      } catch { console.error("nicepay_referral_settlement_pending", { orderId: id }); }
    }
    return outcome;
  }
  async mark(id: string, status: "FAILED" | "REVIEW_REQUIRED", failure: string) {
    const { error } = await this.client.from("nicepay_orders").update({ status, failure_code: failure.slice(0, 100) })
      .eq("id", id).in("status", ["AUTHORIZING", "REVIEW_REQUIRED"]);
    if (error) throw new Error("NICEPAY_STATE_WRITE_FAILED");
  }
  async completeCancel(id: string, reference: string, proofHash: string) {
    const { data, error } = await this.client.rpc("complete_nicepay_cancel", { p_id: id, p_cancel_ref: reference, p_proof_sha256: proofHash });
    if (error) throw new Error("NICEPAY_CANCEL_RECORD_FAILED");
    return z.number().int().nonnegative().parse(data);
  }
  async claimRecovery(id: string) {
    const { data, error } = await this.client.rpc("claim_nicepay_recovery", { p_id: id });
    if (error) throw new Error("NICEPAY_RECOVERY_CLAIM_FAILED");
    return data === true;
  }
}
