import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export function nicepayDigest(value: string): string { return createHash("sha256").update(value).digest("hex"); }
export function nicepayTimestamp(date = new Date()): string {
  return new Date(date.getTime() + 9 * 3_600_000).toISOString().replace(/\D/g, "").slice(0, 14);
}
function verifyDigest(actual: string, expected: string) {
  if (!/^[a-f0-9]{64}$/i.test(actual) || !timingSafeEqual(Buffer.from(actual.toLowerCase()), Buffer.from(expected))) {
    throw new Error("NICEPAY_SIGNATURE_INVALID");
  }
}
export const nicepayConfigSchema = z.object({
  mid: z.string().regex(/^[A-Za-z0-9]{9}m$/),
  merchantKey: z.string().regex(/^[A-Za-z0-9+/]{80,100}={0,2}$/),
});
export type NicepayConfig = z.infer<typeof nicepayConfigSchema>;
const amountString = z.string().regex(/^\d{1,12}$/);
const tidString = z.string().regex(/^[A-Za-z0-9]{30}$/);
export const nicepayAuthSchema = z.object({
  AuthResultCode: z.literal("0000"), AuthToken: z.string().regex(/^[A-Za-z0-9]{40}$/),
  MID: z.string().length(10), Moid: z.string().regex(/^mooa[a-f0-9]{32}$/),
  PayMethod: z.literal("CARD"), Amt: amountString, TxTid: tidString,
  Signature: z.string().regex(/^[a-f0-9]{64}$/i), NextAppURL: z.string().url(), NetCancelURL: z.string().url(),
});
export type NicepayAuth = z.infer<typeof nicepayAuthSchema>;
export type NicepayBoundOrder = { id: string; moid: string; merchant_mid: string; amount: number; tid: string | null };

export function assertNicepayEndpoint(value: string, operation: "approve" | "netCancel"): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || !["dc1-api.nicepay.co.kr", "dc2-api.nicepay.co.kr"].includes(url.hostname)
    || url.port || url.username || url.password || url.search || url.hash
    || url.pathname !== `/webapi/${operation === "approve" ? "pay" : "cancel"}_process.jsp`) {
    throw new Error("NICEPAY_ENDPOINT_NOT_ALLOWED");
  }
  return url.href;
}
export function verifyNicepayAuthentication(auth: NicepayAuth, order: NicepayBoundOrder, config: NicepayConfig) {
  if (auth.MID !== config.mid || order.merchant_mid !== config.mid || auth.Moid !== order.moid
    || Number(auth.Amt) !== order.amount || !auth.TxTid.startsWith(config.mid)) throw new Error("NICEPAY_AUTH_BINDING_INVALID");
  verifyDigest(auth.Signature, nicepayDigest(auth.AuthToken + auth.MID + auth.Amt + config.merchantKey));
  assertNicepayEndpoint(auth.NextAppURL, "approve"); assertNicepayEndpoint(auth.NetCancelURL, "netCancel");
  if (new URL(auth.NextAppURL).host !== new URL(auth.NetCancelURL).host) throw new Error("NICEPAY_DATACENTER_MISMATCH");
}
const approvedSchema = z.object({
  ResultCode: z.string(), MID: z.string(), Moid: z.string(), TID: tidString,
  Amt: amountString, Signature: z.string(), PayMethod: z.literal("CARD"), AuthDate: z.string().optional(),
});
const cancelledSchema = z.object({
  ResultCode: z.enum(["2001", "2211"]), MID: z.string(), TID: tidString, CancelAmt: amountString,
  Signature: z.string(), RemainAmt: amountString, CancelNum: z.string().max(32).optional(),
});
export function verifyNicepayPaymentResponse(raw: unknown, order: NicepayBoundOrder, config: NicepayConfig, tid: string) {
  const data = approvedSchema.parse(raw);
  if (data.MID !== config.mid || order.merchant_mid !== config.mid || data.Moid !== order.moid
    || data.TID !== tid || Number(data.Amt) !== order.amount) throw new Error("NICEPAY_APPROVAL_BINDING_INVALID");
  verifyDigest(data.Signature, nicepayDigest(data.TID + data.MID + data.Amt + config.merchantKey));
  return data;
}
export function verifyNicepayApproval(raw: unknown, order: NicepayBoundOrder, config: NicepayConfig, tid: string) {
  const data = verifyNicepayPaymentResponse(raw, order, config, tid);
  if (data.ResultCode !== "3001") throw new Error("NICEPAY_APPROVAL_DECLINED");
  return data;
}
export function verifyNicepayCancellation(raw: unknown, order: NicepayBoundOrder, config: NicepayConfig, tid: string) {
  const data = cancelledSchema.parse(raw);
  if (data.MID !== config.mid || order.merchant_mid !== config.mid || data.TID !== tid
    || Number(data.CancelAmt) !== order.amount || Number(data.RemainAmt) !== 0) throw new Error("NICEPAY_CANCEL_BINDING_INVALID");
  verifyDigest(data.Signature, nicepayDigest(data.TID + data.MID + data.CancelAmt + config.merchantKey));
  return data;
}

export class NicepayGateway {
  constructor(readonly config: NicepayConfig, private readonly transport: typeof fetch = fetch) {}
  private async post(url: string, fields: Record<string, string>): Promise<unknown> {
    // Every request value here is ASCII, so UTF-8 form bytes are also valid EUC-KR.
    const response = await this.transport(url, { method: "POST", redirect: "error", cache: "no-store",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=euc-kr" },
      body: new URLSearchParams(fields), signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error("NICEPAY_TRANSPORT_FAILED");
    const body = await response.text();
    if (body.length > 64_000) throw new Error("NICEPAY_RESPONSE_TOO_LARGE");
    try { return JSON.parse(body) as unknown; } catch { throw new Error("NICEPAY_RESPONSE_INVALID"); }
  }
  async approve(auth: NicepayAuth, order: NicepayBoundOrder) {
    const EdiDate = nicepayTimestamp();
    return this.post(assertNicepayEndpoint(auth.NextAppURL, "approve"), {
      TID: auth.TxTid, AuthToken: auth.AuthToken, MID: this.config.mid, Amt: String(order.amount), EdiDate,
      SignData: nicepayDigest(auth.AuthToken + this.config.mid + order.amount + EdiDate + this.config.merchantKey),
      CharSet: "utf-8", EdiType: "JSON",
    });
  }
  async netCancel(auth: NicepayAuth, order: NicepayBoundOrder) {
    const EdiDate = nicepayTimestamp();
    const raw = await this.post(assertNicepayEndpoint(auth.NetCancelURL, "netCancel"), {
      TID: auth.TxTid, AuthToken: auth.AuthToken, MID: this.config.mid, Amt: String(order.amount), EdiDate, NetCancel: "1",
      SignData: nicepayDigest(auth.AuthToken + this.config.mid + order.amount + EdiDate + this.config.merchantKey),
      CharSet: "utf-8", EdiType: "JSON",
    });
    return verifyNicepayCancellation(raw, order, this.config, auth.TxTid);
  }
  async cancel(order: NicepayBoundOrder) {
    if (!order.tid || order.merchant_mid !== this.config.mid) throw new Error("NICEPAY_CANCEL_ORDER_INVALID");
    const EdiDate = nicepayTimestamp();
    const raw = await this.post("https://pg-api.nicepay.co.kr/webapi/cancel_process.jsp", {
      TID: order.tid, MID: this.config.mid, Moid: `cancel${order.id.replaceAll("-", "")}`, CancelAmt: String(order.amount),
      CancelMsg: "MOOA service cancellation", PartialCancelCode: "0", EdiDate,
      SignData: nicepayDigest(this.config.mid + order.amount + EdiDate + this.config.merchantKey), CharSet: "utf-8", EdiType: "JSON",
    });
    return verifyNicepayCancellation(raw, order, this.config, order.tid);
  }
  async inquire(order: NicepayBoundOrder) {
    if (!order.tid || order.merchant_mid !== this.config.mid) throw new Error("NICEPAY_QUERY_ORDER_INVALID");
    const EdiDate = nicepayTimestamp();
    const raw = await this.post("https://webapi.nicepay.co.kr/webapi/inquery/trans_status.jsp", {
      TID: order.tid, MID: this.config.mid, EdiDate,
      SignData: nicepayDigest(order.tid + this.config.mid + EdiDate + this.config.merchantKey), CharSet: "utf-8", EdiType: "JSON",
    });
    const data = z.object({ ResultCode: z.literal("0000"), TID: z.string(), Status: z.enum(["0", "1", "9"]) }).parse(raw);
    if (data.TID !== order.tid) throw new Error("NICEPAY_QUERY_BINDING_INVALID");
    return data;
  }
}
