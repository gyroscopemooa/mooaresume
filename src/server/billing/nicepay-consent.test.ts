import { afterEach, expect, it, vi } from "vitest";
import { signNicepayConsent, verifyNicepayConsent } from "./nicepay-consent";
import type { NicepayConsent } from "@/domain/nicepay-method";
const consent: NicepayConsent = { version: "2026-11-13", financial: true, collection: true, sharing: true };
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
function fixture() { vi.stubEnv("NICEPAY_MID", "test00001m"); vi.stubEnv("NICEPAY_MERCHANT_KEY", Buffer.alloc(64, 9).toString("base64")); return { id: "order-a", owner_user_id: "owner-a", expires_at: new Date(Date.now() + 60_000).toISOString() }; }
it("binds the short-lived consent receipt to owner, order, wallet and expiry", () => {
  const order = fixture(); const token = signNicepayConsent(order, "KAKAO", consent);
  expect(verifyNicepayConsent(token, order, "KAKAO")).toEqual(consent);
  expect(verifyNicepayConsent(token, { ...order, id: "other" }, "KAKAO")).toBeUndefined();
  expect(verifyNicepayConsent(token, { ...order, owner_user_id: "other" }, "KAKAO")).toBeUndefined();
  expect(verifyNicepayConsent(token, order, "SAMSUNG")).toBeUndefined();
  expect(verifyNicepayConsent(token + "x", order, "KAKAO")).toBeUndefined();
  expect(verifyNicepayConsent("true", order, "KAKAO")).toBeUndefined();
  vi.useFakeTimers(); vi.setSystemTime(Date.now() + 61_000);
  expect(verifyNicepayConsent(token, order, "KAKAO")).toBeUndefined();
});
it("rejects missing required consent or Naver method", () => {
  const order = fixture();
  expect(() => signNicepayConsent(order, "NAVER", consent)).toThrow("NICEPAY_NAVER_METHOD_REQUIRED");
  expect(() => signNicepayConsent(order, "KAKAO", { ...consent, sharing: false } as unknown as NicepayConsent)).toThrow();
});
