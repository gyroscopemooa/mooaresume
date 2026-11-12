import { afterEach, describe, expect, it, vi } from "vitest";
import { nicepayDigest, NicepayGateway, verifyNicepayAuthentication, verifyNicepayApproval, assertNicepayEndpoint, verifyNicepayCancellation } from "./nicepay-protocol";
import { processNicepayAuthentication, recoverNicepayOrder } from "./nicepay-payment-service";
import type { NicepayOrder, NicepayOrderRepository } from "./nicepay-order-repository";
import { createCheckoutQuote } from "@/domain/usage-entitlement";

const config = { mid: "test00001m", merchantKey: Buffer.alloc(64, 9).toString("base64") };
const tid = config.mid + "1".repeat(20);
const order: NicepayOrder = { id: "10000000-0000-4000-8000-000000000001", moid: "mooa10000000000040008000000000000001",
  owner_user_id: "20000000-0000-4000-8000-000000000001", application_case_id: "30000000-0000-4000-8000-000000000001",
  analysis_run_id: "40000000-0000-4000-8000-000000000001", product: "QUICK", method: "CARD", merchant_mid: config.mid,
  amount: 9900, currency: "krw", pricing_version: "source-v1-fixed", quote_snapshot: createCheckoutQuote("QUICK", 700),
  test_purchase: true, status: "OPEN", tid: null, billing_order_id: null, expires_at: "2026-11-14T00:00:00Z" };
const auth = { AuthResultCode: "0000" as const, AuthToken: "A".repeat(40), MID: config.mid, Moid: order.moid, PayMethod: "CARD" as const,
  Amt: "9900", TxTid: tid, Signature: nicepayDigest("A".repeat(40) + config.mid + "9900" + config.merchantKey),
  NextAppURL: "https://dc1-api.nicepay.co.kr/webapi/pay_process.jsp", NetCancelURL: "https://dc1-api.nicepay.co.kr/webapi/cancel_process.jsp" };
function proof(code = "3001") { return { ResultCode: code, MID: config.mid, Moid: order.moid, TID: tid, Amt: "000000009900", PayMethod: "CARD",
  Signature: nicepayDigest(tid + config.mid + "000000009900" + config.merchantKey) }; }
function cancellation() { return { ResultCode: "2001" as const, MID: config.mid, TID: tid, CancelAmt: "000000009900", RemainAmt: "000000000000", CancelNum: "cancel1",
  Signature: nicepayDigest(tid + config.mid + "000000009900" + config.merchantKey) }; }
function fixture() {
  const repository = { loadByMoid: vi.fn(async () => order), claimApproval: vi.fn(async () => "CLAIMED"), grant: vi.fn(async () => "GRANTED"),
    mark: vi.fn(async () => {}), completeCancel: vi.fn(async () => 1), claimRecovery: vi.fn(async () => true) } satisfies NicepayOrderRepository;
  const gateway = new NicepayGateway(config);
  const approve = vi.spyOn(gateway, "approve").mockResolvedValue(proof());
  const netCancel = vi.spyOn(gateway, "netCancel").mockResolvedValue(cancellation());
  const cancel = vi.spyOn(gateway, "cancel").mockResolvedValue(cancellation());
  const inquire = vi.spyOn(gateway, "inquire").mockResolvedValue({ ResultCode: "0000", TID: tid, Status: "0" });
  return { repository, gateway, approve, netCancel, cancel, inquire };
}
afterEach(() => vi.restoreAllMocks());
describe("NICE authentication/approval boundaries", () => {
  it("grants only after validating authentication and signed approval", async () => {
    const f = fixture(); const result = await processNicepayAuthentication(auth, f.repository, f.gateway);
    expect(result.disposition).toBe("PAID"); expect(f.approve).toHaveBeenCalledTimes(1);
    expect(f.repository.claimApproval).toHaveBeenCalledWith(order.id, tid, nicepayDigest(auth.AuthToken));
    expect(f.repository.grant).toHaveBeenCalledWith(order.id, tid, expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(f.netCancel).not.toHaveBeenCalled();
  });
  it.each(["ALREADY_PAID", "IN_PROGRESS", "NOT_OPEN"])("never replays an approval after claim %s", async claim => {
    const f = fixture(); f.repository.claimApproval.mockResolvedValue(claim);
    const result = await processNicepayAuthentication(auth, f.repository, f.gateway);
    expect(result.disposition).toBe(claim === "ALREADY_PAID" ? "PAID" : claim === "IN_PROGRESS" ? "WAITING" : "FAILED");
    expect(f.approve).not.toHaveBeenCalled(); expect(f.repository.grant).not.toHaveBeenCalled();
  });
  it.each([{ Amt: "1" }, { MID: "other0001m" }, { Signature: "0".repeat(64) }, { NextAppURL: "https://attacker.example/collect" }])("rejects a forged callback before a claim or request", async forged => {
    const f = fixture(); await expect(processNicepayAuthentication({ ...auth, ...forged }, f.repository, f.gateway)).rejects.toThrow();
    expect(f.approve).not.toHaveBeenCalled(); expect(f.repository.claimApproval).not.toHaveBeenCalled();
  });
  it("records a genuinely signed decline without granting access", async () => {
    const f = fixture(); f.approve.mockResolvedValue(proof("3002"));
    expect((await processNicepayAuthentication(auth, f.repository, f.gateway)).disposition).toBe("FAILED");
    expect(f.repository.grant).not.toHaveBeenCalled(); expect(f.repository.mark).toHaveBeenCalledWith(order.id, "FAILED", "NICEPAY_APPROVAL_DECLINED");
  });
  it.each(["transport", "signature", "database"])("network-cancels uncertain %s outcome without re-approval", async failure => {
    const f = fixture();
    if (failure === "transport") f.approve.mockRejectedValue(new Error("timeout"));
    if (failure === "signature") f.approve.mockResolvedValue({ ...proof(), Signature: "0".repeat(64) });
    if (failure === "database") f.repository.grant.mockRejectedValue(new Error("database unavailable"));
    expect((await processNicepayAuthentication(auth, f.repository, f.gateway)).disposition).toBe("CANCELLED");
    expect(f.approve).toHaveBeenCalledTimes(1); expect(f.netCancel).toHaveBeenCalledTimes(1); expect(f.repository.completeCancel).toHaveBeenCalledTimes(1);
  });
  it("keeps uncertainty explicit if network cancellation cannot be confirmed", async () => {
    const f = fixture(); f.approve.mockRejectedValue(new Error("timeout")); f.netCancel.mockRejectedValue(new Error("timeout"));
    expect((await processNicepayAuthentication(auth, f.repository, f.gateway)).disposition).toBe("REVIEW_REQUIRED");
    expect(f.repository.grant).not.toHaveBeenCalled(); expect(f.repository.mark).toHaveBeenCalledWith(order.id, "REVIEW_REQUIRED", "NICEPAY_APPROVAL_UNCERTAIN");
  });
  it("cancels the new charge if another entitlement won", async () => {
    const f = fixture(); f.repository.grant.mockResolvedValue("CANCEL_REQUIRED");
    expect((await processNicepayAuthentication(auth, f.repository, f.gateway)).disposition).toBe("CANCELLED");
    expect(f.cancel).toHaveBeenCalledWith({ ...order, tid }); expect(f.repository.completeCancel).toHaveBeenCalledTimes(1);
  });
  it("recovers a committed provider payment using the bound TID inquiry, never approval replay", async () => {
    const f = fixture(); expect(await recoverNicepayOrder({ ...order, status: "AUTHORIZING", tid }, f.repository, f.gateway)).toBe("PAID");
    expect(f.inquire).toHaveBeenCalledTimes(1); expect(f.approve).not.toHaveBeenCalled(); expect(f.repository.grant).toHaveBeenCalledTimes(1);
  });
  it("uses an exclusive recovery lease", async () => {
    const f = fixture(); f.repository.claimRecovery.mockResolvedValue(false);
    expect(await recoverNicepayOrder({ ...order, tid }, f.repository, f.gateway)).toBe("WAITING"); expect(f.inquire).not.toHaveBeenCalled();
  });
});
describe("NICE protocol verification", () => {
  it("accepts padded response amounts but verifies their exact signed representation", () => {
    expect(verifyNicepayApproval(proof(), order, config, tid).Amt).toBe("000000009900");
    expect(verifyNicepayCancellation(cancellation(), order, config, tid).RemainAmt).toBe("000000000000");
    expect(() => verifyNicepayApproval({ ...proof(), Amt: "9900" }, order, config, tid)).toThrow();
    expect(() => verifyNicepayCancellation({ ...cancellation(), RemainAmt: "1" }, order, config, tid)).toThrow();
  });
  it.each(["http://dc1-api.nicepay.co.kr/webapi/pay_process.jsp", "https://dc1-api.nicepay.co.kr.attacker.example/webapi/pay_process.jsp", "https://dc1-api.nicepay.co.kr/webapi/pay_process.jsp?x=1", "https://dc1-api.nicepay.co.kr:8443/webapi/pay_process.jsp", "https://user:pass@dc1-api.nicepay.co.kr/webapi/pay_process.jsp"])("rejects SSRF/credential forwarding target %s", url => {
    expect(() => assertNicepayEndpoint(url, "approve")).toThrow();
  });
  it("rejects mismatched data centers", () => {
    expect(() => verifyNicepayAuthentication({ ...auth, NetCancelURL: "https://dc2-api.nicepay.co.kr/webapi/cancel_process.jsp" }, order, config)).toThrow();
  });
  it("sends server-generated approval fields over the pinned transport", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(proof())));
    const gateway = new NicepayGateway(config, transport); await gateway.approve(auth, order);
    const [url, options] = transport.mock.calls[0];
    expect(url).toBe(auth.NextAppURL); expect(options?.redirect).toBe("error");
    const fields = new URLSearchParams(String(options?.body));
    expect(fields.get("Amt")).toBe("9900"); expect(fields.get("MID")).toBe(config.mid);
    expect(fields.get("SignData")).toBe(nicepayDigest(auth.AuthToken + config.mid + "9900" + fields.get("EdiDate") + config.merchantKey));
    expect(String(options?.body)).not.toContain(config.merchantKey);
  });
});
