import "server-only";

import { Polar } from "@polar-sh/sdk";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getPolarCheckoutConfiguration } from "./polar-checkout";
import { resolveRefundableAmount } from "./polar-refundable-amount";

const claimSchema = z.discriminatedUnion("disposition", [
  z.object({ disposition: z.literal("COMPLETED") }),
  z.object({ disposition: z.literal("RUNNING") }),
  z.object({ disposition: z.literal("NOOP") }),
  z.object({ disposition: z.literal("FAILED_WITHOUT_ORDER") }),
  z.object({ disposition: z.literal("REFUND_SUBMITTED") }),
  z.object({ disposition: z.literal("REFUND_IN_PROGRESS") }),
  z.object({
    disposition: z.literal("REFUND_REQUIRED"),
    billingOrderId: z.string().uuid(),
    providerOrderId: z.string().min(1),
    amount: z.number().int().positive(),
    currency: z.string().length(3),
  }),
]);

function serviceClient() {
  const url = z.string().url().parse(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = z.string().min(1).parse(process.env.SUPABASE_SECRET_KEY);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function refundTimedOutQuickAnalysis(input: { analysisRunId: string; ownerUserId: string }) {
  const supabase = serviceClient();
  const { data, error } = await supabase.rpc("claim_quick_analysis_timeout_refund", {
    p_analysis_run_id: input.analysisRunId,
    p_owner_user_id: input.ownerUserId,
    p_timeout_seconds: 600,
  });
  if (error) {
    throw new Error(
      `QUICK_TIMEOUT_CLAIM_FAILED:${error.code}:${error.message}:${error.details ?? ""}:${error.hint ?? ""}`,
    );
  }
  const claim = claimSchema.parse(data);
  if (claim.disposition !== "REFUND_REQUIRED") return claim;

  try {
    const config = getPolarCheckoutConfiguration();
    const polar = new Polar({ accessToken: config.accessToken, server: config.server });
    // 저장해 둔 금액은 `totalAmount`라 폴라가 돌려줄 수 있는 것보다 클 수
    // 있습니다. 그대로 보내면 "Refund amount exceeds refundable amount"로
    // 통째로 거절당하고, 손님은 한 푼도 못 돌려받습니다.
    const refundAmount = await resolveRefundableAmount(polar, claim.providerOrderId, claim.amount);
    if (refundAmount <= 0) throw new Error("POLAR_NOTHING_REFUNDABLE");
    const refund = await polar.refunds.create({
      orderId: claim.providerOrderId,
      amount: refundAmount,
      reason: "service_disruption",
      comment: "Automatic refund: QUICK analysis exceeded 10 minutes without a result.",
      revokeBenefits: true,
      metadata: { analysisRunId: input.analysisRunId, automatic: true },
    }, { timeoutMs: 10_000 });

    const { error: markError } = await supabase.rpc("mark_quick_auto_refund_submitted", {
      p_billing_order_id: claim.billingOrderId,
      p_provider_refund_id: refund.id,
    });
    if (markError) throw new Error(`QUICK_TIMEOUT_REFUND_MARK_FAILED:${markError.code}`);
    return { disposition: "REFUND_SUBMITTED" as const };
  } catch (error) {
    await supabase.rpc("mark_quick_auto_refund_uncertain", {
      p_billing_order_id: claim.billingOrderId,
    });
    throw error;
  }
}

