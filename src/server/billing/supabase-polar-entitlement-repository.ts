import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { PolarEntitlementRepository } from "./polar-webhook";

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

export class SupabasePolarEntitlementRepository implements PolarEntitlementRepository {
  async grantPaidOrder(input: Parameters<PolarEntitlementRepository["grantPaidOrder"]>[0]) {
    const { data, error } = await createServiceRoleClient().rpc(
      "grant_polar_order_entitlement",
      {
        p_event_id: input.eventId,
        p_event_type: input.eventType,
        p_payload_sha256: input.payloadSha256,
        p_provider_order_id: input.providerOrderId,
        p_provider_checkout_id: input.providerCheckoutId,
        p_application_case_id: input.applicationCaseId,
        p_product: input.product,
        p_allowed_characters: input.allowedCharacters,
        p_amount: input.amount,
        p_currency: input.currency,
        p_paid_at: input.paidAt,
        p_metadata: input.metadata,
      },
    );
    if (error) throw new Error(`POLAR_ENTITLEMENT_GRANT_FAILED:${error.code}`);
    const { error: checkoutError } = await createServiceRoleClient().rpc(
      "mark_polar_checkout_succeeded",
      { p_provider_checkout_id: input.providerCheckoutId },
    );
    if (checkoutError) {
      throw new Error(`POLAR_CHECKOUT_INTENT_UPDATE_FAILED:${checkoutError.code}`);
    }
    return z.string().parse(data);
  }

  async refundOrder(input: Parameters<PolarEntitlementRepository["refundOrder"]>[0]) {
    const { data, error } = await createServiceRoleClient().rpc(
      "refund_polar_order_entitlement",
      {
        p_event_id: input.eventId,
        p_event_type: input.eventType,
        p_payload_sha256: input.payloadSha256,
        p_provider_order_id: input.providerOrderId,
        p_refunded_at: input.refundedAt,
        p_requires_review: input.requiresReview,
      },
    );
    if (error) throw new Error(`POLAR_ENTITLEMENT_REFUND_FAILED:${error.code}`);
    return z.string().parse(data);
  }
}
