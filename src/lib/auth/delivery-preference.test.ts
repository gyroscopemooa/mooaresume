import { afterEach, describe, expect, it, vi } from "vitest";
import { canStartWithDelivery, checkoutEmail, hasVerifiedAccountEmail, isDashboardEligible, isDashboardOnly, notificationEmail } from "./delivery-preference";
const id = "3b6a0483-61ba-4783-b6b9-458e2630cad1";
const preference = { version: 1, mode: "dashboard_only", user_id: id, updated_at: "2026-11-11T00:00:00Z" };
const user = { id, app_metadata: { provider: "kakao", mooa_delivery_preference: preference } };
afterEach(() => vi.unstubAllEnvs());
describe("trusted delivery preference", () => {
  it.each(["kakao", "custom:naver"])("permits explicit dashboard-only %s without email", (provider) => {
    const current = { ...user, app_metadata: { ...user.app_metadata, provider } };
    expect(isDashboardEligible(current)).toBe(true);
    expect(isDashboardOnly(current)).toBe(true);
    expect(canStartWithDelivery(current)).toBe(true);
    expect(hasVerifiedAccountEmail(current)).toBe(false);
    expect(notificationEmail(current)).toBeUndefined();
    expect(checkoutEmail(current)).toBeUndefined();
  });
  it("suppresses even verified Kakao mail while retaining verified billing address", () => {
    const current = { ...user, email: "verified@example.com", email_confirmed_at: "2026-11-11" };
    expect(notificationEmail(current)).toBeUndefined();
    expect(checkoutEmail(current)).toBe(current.email);
  });
  it.each([{ ...preference, user_id: "another" }, { ...preference, version: 2 }, { ...preference, updated_at: "invalid" }, { ...preference, mode: "email" }, null])("rejects invalid preference %j", (mooa_delivery_preference) => {
    expect(canStartWithDelivery({ ...user, app_metadata: { provider: "kakao", mooa_delivery_preference } })).toBe(false);
  });
  it("ignores mutable preference/provider claims and preserves legacy behavior", () => {
    const mutable = { id, app_metadata: { provider: "kakao" }, user_metadata: { mooa_delivery_preference: preference, email_verified: true } };
    expect(canStartWithDelivery(mutable)).toBe(false);
    expect(notificationEmail({ ...mutable, email: "unverified@example.com" })).toBeUndefined();
    for (const provider of ["google", "email"]) {
      const legacy = { ...user, email: "old@example.com", app_metadata: { provider, mooa_delivery_preference: preference } };
      expect(isDashboardOnly(legacy)).toBe(false);
      expect(canStartWithDelivery(legacy)).toBe(true);
      expect(notificationEmail(legacy)).toBe(legacy.email);
    }
  });
  it("recognizes only configured Naver and trusted linked providers", () => {
    vi.stubEnv("NEXT_PUBLIC_NAVER_AUTH_PROVIDER", "custom:naver-kr");
    expect(isDashboardEligible({ app_metadata: { providers: ["google", "custom:naver-kr"] } })).toBe(true);
    expect(isDashboardEligible({ app_metadata: { provider: "custom:unrelated" } })).toBe(false);
  });
});
