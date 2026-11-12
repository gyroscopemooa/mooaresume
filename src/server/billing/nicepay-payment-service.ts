import "server-only";
import { nicepayAuthSchema, nicepayConfigSchema, nicepayDigest, NicepayGateway, verifyNicepayPaymentResponse, verifyNicepayAuthentication } from "./nicepay-protocol";
import type { NicepayOrder, NicepayOrderRepository } from "./nicepay-order-repository";

export function getNicepayPaymentConfig() {
  return nicepayConfigSchema.parse({ mid: process.env.NICEPAY_MID, merchantKey: process.env.NICEPAY_MERCHANT_KEY });
}
export function nicepayAvailableFor(userId: string): boolean {
  if (process.env.NICEPAY_ENABLED !== "true") return false;
  if (!nicepayConfigSchema.safeParse({ mid: process.env.NICEPAY_MID, merchantKey: process.env.NICEPAY_MERCHANT_KEY }).success) return false;
  return process.env.NICEPAY_PUBLIC_ENABLED === "true"
    || (process.env.NICEPAY_PILOT_USER_IDS ?? "").split(",").map(value => value.trim()).includes(userId);
}
export type NicepayPaymentOutcome = { order: NicepayOrder; disposition: "PAID" | "WAITING" | "FAILED" | "CANCELLED" | "REVIEW_REQUIRED" };

async function recordGrant(repo: NicepayOrderRepository, gateway: NicepayGateway, order: NicepayOrder, tid: string, proof: unknown): Promise<NicepayPaymentOutcome["disposition"]> {
  const result = await repo.grant(order.id, tid, nicepayDigest(JSON.stringify(proof)));
  if (result !== "CANCEL_REQUIRED") return "PAID";
  // Another provider/entitlement won before approval completed: refund this new charge.
  const cancellation = await gateway.cancel({ ...order, tid });
  await repo.completeCancel(order.id, cancellation.CancelNum ?? tid, nicepayDigest(JSON.stringify(cancellation)));
  return "CANCELLED";
}

export async function processNicepayAuthentication(raw: unknown, repo: NicepayOrderRepository, gateway: NicepayGateway): Promise<NicepayPaymentOutcome> {
  const auth = nicepayAuthSchema.parse(raw);
  const order = await repo.loadByMoid(auth.Moid);
  if (!order) throw new Error("NICEPAY_ORDER_NOT_FOUND");
  verifyNicepayAuthentication(auth, order, gateway.config);
  const claim = await repo.claimApproval(order.id, auth.TxTid, nicepayDigest(auth.AuthToken));
  if (claim === "ALREADY_PAID") return { order, disposition: "PAID" };
  if (claim === "IN_PROGRESS") return { order, disposition: "WAITING" };
  if (claim !== "CLAIMED") return { order, disposition: "FAILED" };
  let approved = false;
  try {
    const response = await gateway.approve(auth, order);
    // A declined provider response must never mint access. Unknown/invalid responses
    // use network cancellation because the charge outcome may be uncertain.
    const proof = verifyNicepayPaymentResponse(response, order, gateway.config, auth.TxTid);
    if (proof.ResultCode !== "3001") {
      await repo.mark(order.id, "FAILED", "NICEPAY_APPROVAL_DECLINED");
      return { order, disposition: "FAILED" };
    }
    approved = true;
    return { order, disposition: await recordGrant(repo, gateway, order, auth.TxTid, proof) };
  } catch {
    // Never retry the approval request. A missing response, crash or DB failure is
    // recovered by cancellation or the authenticated TID inquiry, not a second charge.
    try {
      const cancellation = await gateway.netCancel(auth, order);
      await repo.completeCancel(order.id, cancellation.CancelNum ?? auth.TxTid, nicepayDigest(JSON.stringify(cancellation)));
      return { order, disposition: "CANCELLED" };
    } catch {
      await repo.mark(order.id, "REVIEW_REQUIRED", approved ? "NICEPAY_FULFILLMENT_UNCERTAIN" : "NICEPAY_APPROVAL_UNCERTAIN");
      return { order, disposition: "REVIEW_REQUIRED" };
    }
  }
}

export async function recoverNicepayOrder(order: NicepayOrder, repo: NicepayOrderRepository, gateway: NicepayGateway): Promise<NicepayPaymentOutcome["disposition"]> {
  if (!order.tid || !(await repo.claimRecovery(order.id))) return "WAITING";
  try {
    const proof = await gateway.inquire(order);
    if (proof.Status === "0") return await recordGrant(repo, gateway, order, order.tid, proof);
    if (proof.Status === "1") {
      await repo.completeCancel(order.id, order.tid, nicepayDigest(JSON.stringify(proof)));
      return "CANCELLED";
    }
    // 'No transaction' is not an excuse to replay an old approval token.
    await repo.mark(order.id, "REVIEW_REQUIRED", "NICEPAY_TRANSACTION_NOT_FOUND");
  } catch { await repo.mark(order.id, "REVIEW_REQUIRED", "NICEPAY_RECONCILIATION_UNAVAILABLE"); }
  return "REVIEW_REQUIRED";
}
