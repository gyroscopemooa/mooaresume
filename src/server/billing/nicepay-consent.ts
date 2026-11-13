import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { nicepayConsentSchema, type NicepayBrand, type NicepayConsent } from "@/domain/nicepay-method";
import { getNicepayPaymentConfig } from "./nicepay-payment-service";

type Binding = { id: string; owner_user_id: string; expires_at: string };
const receiptSchema = z.object({ order: z.string(), owner: z.string(), brand: z.enum(["KAKAO", "NAVER", "SAMSUNG"]), consent: nicepayConsentSchema, expires: z.number().finite() }).strict();
function signature(payload: string) { return createHmac("sha256", getNicepayPaymentConfig().merchantKey).update("inline-consent-v1:" + payload).digest("base64url"); }
export function signNicepayConsent(order: Binding, brand: NicepayBrand, consent: NicepayConsent): string {
  const value = nicepayConsentSchema.parse(consent);
  if (brand === "NAVER" && !value.naverMethod) throw new Error("NICEPAY_NAVER_METHOD_REQUIRED");
  const payload = Buffer.from(JSON.stringify({ order: order.id, owner: order.owner_user_id, brand, consent: value,
    expires: Math.min(Date.parse(order.expires_at), Date.now() + 15 * 60_000) })).toString("base64url");
  return payload + "." + signature(payload);
}
export function verifyNicepayConsent(token: string | null, order: Binding, brand: NicepayBrand): NicepayConsent | undefined {
  if (!token || token.length > 1800) return;
  try {
    const [payload, sig, extra] = token.split(".");
    const expected = signature(payload);
    if (extra || !sig || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return;
    const value = receiptSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    if (value.order !== order.id || value.owner !== order.owner_user_id || value.brand !== brand || !Number.isFinite(value.expires)
      || value.expires <= Date.now() || value.expires > Date.parse(order.expires_at)) return;
    const consent = nicepayConsentSchema.parse(value.consent);
    if (brand === "NAVER" && !consent.naverMethod) return;
    return consent;
  } catch { return; }
}
