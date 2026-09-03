import "server-only";

import { createClient } from "@supabase/supabase-js";
import { Polar } from "@polar-sh/sdk";
import { z } from "zod";
import { getPolarCheckoutConfiguration } from "./polar-checkout";
import { resolveRefundableAmount } from "./polar-refundable-amount";

/**
 * 더 시도할 것이 없는 실패를 환불합니다.
 *
 * 10분을 넘긴 분석은 예전부터 자동으로 환불하고 있었는데, 아예 실패한 분석은
 * 이용권만 되살리고 돈은 그대로 두었습니다. 손님 쪽에서 보면 뒤쪽이 더
 * 나쁩니다 — 10분을 넘긴 건 아직 나올 수도 있지만 최종 실패는 나오지 않고,
 * 그때까지 자동 재시도를 두 번 다 쓴 뒤입니다.
 *
 * 환불이 접수된 **뒤에** 이용권을 거둡니다. 순서를 뒤집으면 환불이 실패했을
 * 때 손님에게 돈도 이용권도 남지 않습니다.
 */

const claimSchema = z.discriminatedUnion("disposition", [
  z.object({ disposition: z.literal("COMPLETED") }),
  z.object({ disposition: z.literal("RETRYABLE") }),
  z.object({ disposition: z.literal("FAILED_WITHOUT_ORDER") }),
  z.object({ disposition: z.literal("REFUND_SUBMITTED") }),
  z.object({ disposition: z.literal("REFUND_IN_PROGRESS") }),
  z.object({
    disposition: z.literal("REFUND_REQUIRED"),
    billingOrderId: z.string().uuid(),
    providerOrderId: z.string().min(1),
    amount: z.number().int().positive(),
    currency: z.string().min(1),
  }),
]);

export type FailureRefundOutcome =
  | { disposition: "REFUNDED"; amount: number; currency: string; entitlementsRevoked: number }
  | { disposition: "NOT_REFUNDED"; reason: string };

function serviceClient() {
  const url = z.string().url().parse(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = z.string().min(1).parse(process.env.SUPABASE_SECRET_KEY);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function refundExhaustedRun(input: {
  analysisRunId: string;
  ownerUserId: string;
}): Promise<FailureRefundOutcome> {
  const supabase = serviceClient();
  const { data, error } = await supabase.rpc("claim_quick_analysis_failure_refund", {
    p_analysis_run_id: input.analysisRunId,
    p_owner_user_id: input.ownerUserId,
  });
  if (error) {
    throw new Error(
      `QUICK_FAILURE_CLAIM_FAILED:${error.code}:${error.message}:${error.details ?? ""}:${error.hint ?? ""}`,
    );
  }

  const claim = claimSchema.parse(data);
  if (claim.disposition !== "REFUND_REQUIRED") {
    return { disposition: "NOT_REFUNDED", reason: claim.disposition };
  }

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
      // 폴라 쪽에서도 혜택을 거두게 합니다. 우리 쪽 회수와 겹치지만, 웹훅이
      // 늦거나 유실되어도 한쪽은 반드시 걸립니다. 두 번 거두어도 이미 REVOKED인
      // 줄은 다시 바뀌지 않습니다.
      revokeBenefits: true,
      comment: "Automatic refund: analysis failed with no attempts left.",
      metadata: { analysisRunId: input.analysisRunId, automatic: true },
    }, { timeoutMs: 10_000 });

    const { error: markError } = await supabase.rpc("mark_quick_auto_refund_submitted", {
      p_billing_order_id: claim.billingOrderId,
      p_provider_refund_id: refund.id,
    });
    if (markError) throw new Error(`QUICK_FAILURE_REFUND_MARK_FAILED:${markError.code}`);

    // 여기서부터가 회수입니다. 돈이 나간 것을 확인한 뒤이므로, 이용권을 거두어도
    // 손님이 빈손이 되지 않습니다.
    const { data: revoked, error: revokeError } = await supabase.rpc("revoke_refunded_analysis_entitlement", {
      p_billing_order_id: claim.billingOrderId,
      p_owner_user_id: input.ownerUserId,
    });
    if (revokeError) {
      // 환불은 이미 됐습니다. 여기서 던지면 바깥은 "환불 실패"로 읽고 다시
      // 시도하려 들 텐데, 그건 두 번 환불하는 길입니다. 로그만 남기고
      // 환불됐다고 답합니다 — 남은 이용권은 폴라 웹훅이 거둡니다.
      console.error("quick_failure_refund_revoke_failed", { code: revokeError.code, analysisRunId: input.analysisRunId });
      return { disposition: "REFUNDED", amount: claim.amount, currency: claim.currency, entitlementsRevoked: 0 };
    }

    return {
      disposition: "REFUNDED",
      amount: claim.amount,
      currency: claim.currency,
      entitlementsRevoked: z.number().int().nonnegative().catch(0).parse(revoked),
    };
  } catch (caught) {
    // 접수했는지조차 모르는 상태로 남깁니다. 이 표시가 있으면 두 경로 모두
    // 다시 환불하지 않고, 관리자가 폴라에서 확인해 정리합니다.
    await supabase.rpc("mark_quick_auto_refund_uncertain", { p_billing_order_id: claim.billingOrderId });
    throw caught;
  }
}
