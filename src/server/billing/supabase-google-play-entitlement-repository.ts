import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { GooglePlayEntitlementRepository } from "./google-play-verification";

const serverBillingEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

function createServiceRoleClient() {
  const env = serverBillingEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Same shape as SupabasePolarEntitlementRepository
 * (supabase-polar-entitlement-repository.ts), including the referral
 * settlement call. Duplicated rather than shared: that file is the live,
 * revenue-critical Polar path, and this project's change-preservation rule
 * (docs/agent-change-log.md) is to add alongside protected code, not refactor
 * it — even for a same-shape helper this small.
 */
export class SupabaseGooglePlayEntitlementRepository implements GooglePlayEntitlementRepository {
  async grantPaidOrder(input: Parameters<GooglePlayEntitlementRepository["grantPaidOrder"]>[0]) {
    const { data, error } = await createServiceRoleClient().rpc(
      "grant_google_play_order_entitlement",
      {
        p_event_id: input.eventId,
        p_payload_sha256: input.payloadSha256,
        p_provider_order_id: input.providerOrderId,
        p_application_case_id: input.applicationCaseId,
        p_product: input.product,
        p_allowed_characters: input.allowedCharacters,
        p_amount: input.amount,
        p_currency: input.currency,
        p_paid_at: input.paidAt,
        p_metadata: input.metadata,
      },
    );
    if (error) throw new Error(`GOOGLE_PLAY_ENTITLEMENT_GRANT_FAILED:${error.code}`);
    const outcome = z.string().parse(data);
    if (outcome === "GRANTED") await this.settleReferral(input.providerOrderId);
    return outcome;
  }

  async findExistingGrant(input: Parameters<GooglePlayEntitlementRepository["findExistingGrant"]>[0]) {
    const client = createServiceRoleClient();
    const byToken = await client
      .from("billing_orders")
      .select("application_case_id, owner_user_id")
      .eq("provider", "GOOGLE_PLAY")
      .eq("metadata->>purchaseTokenSha256", input.purchaseTokenSha256)
      .limit(1)
      .maybeSingle();
    if (byToken.error) throw new Error(`GOOGLE_PLAY_GRANT_LOOKUP_FAILED:${byToken.error.code}`);
    let row = byToken.data;
    if (!row && input.providerOrderId) {
      const byOrder = await client
        .from("billing_orders")
        .select("application_case_id, owner_user_id")
        .eq("provider", "GOOGLE_PLAY")
        .eq("provider_order_id", input.providerOrderId)
        .maybeSingle();
      if (byOrder.error) throw new Error(`GOOGLE_PLAY_GRANT_LOOKUP_FAILED:${byOrder.error.code}`);
      row = byOrder.data;
    }
    if (!row) return null;
    return { applicationCaseId: String(row.application_case_id), ownerUserId: String(row.owner_user_id) };
  }

  /**
   * Pays the referrer, if this buyer arrived through someone's code. Never
   * throws — see the same note on SupabasePolarEntitlementRepository's
   * settleReferral: the order is already paid and the entitlement already
   * granted, so a referral problem must not turn a completed purchase into a
   * failed request.
   */
  private async settleReferral(providerOrderId: string) {
    try {
      const client = createServiceRoleClient();
      const { data: order } = await client
        .from("billing_orders")
        .select("id")
        .eq("provider", "GOOGLE_PLAY")
        .eq("provider_order_id", providerOrderId)
        .maybeSingle();
      const orderId = order?.id as string | undefined;
      if (!orderId) return;
      const { data: settled, error } = await client.rpc("settle_referral_for_order", { p_billing_order_id: orderId });
      if (error) console.error("referral_settle_failed", error.message);
      else if (settled === "CONVERTED") console.info("referral_converted", orderId);
    } catch (caught) {
      console.error("referral_settle_failed", caught instanceof Error ? caught.message : "UNKNOWN_ERROR");
    }
  }
}
