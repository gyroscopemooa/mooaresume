import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { socialEmailGuard } from "./social-email-guard";
import { handleCheckoutRequest } from "@/server/billing/checkout-route";
import { guardMemberRequest } from "@/server/http/request-guards";
import { POST as resumeCheckout } from "@/app/api/resume-builds/route";
import { POST as careerDescriptionCheckout } from "@/app/api/career-description-builds/route";
import { POST as portfolioCheckout } from "@/app/api/portfolio-builds/route";
import { POST as careerAiCheckout } from "@/app/api/career-ai-builds/route";
import { POST as interviewCheckout } from "@/app/api/interview/retry/checkout/route";
import { POST as quickExecute } from "@/app/api/analysis-runs/quick/execute/route";

const { getUser, rpc, from, authenticateMobile, mobileFailure } = vi.hoisted(() => ({
  getUser: vi.fn(), rpc: vi.fn(), from: vi.fn(), authenticateMobile: vi.fn(), mobileFailure: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser }, rpc, from }) }));
vi.mock("@/server/mobile/auth", () => ({ authenticateMobile, mobileFailure }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_NAVER_AUTH_PROVIDER", "custom:naver");
  getUser.mockResolvedValue({ data: { user: { id: "new-social-user", app_metadata: { provider: "kakao" } } }, error: null });
  authenticateMobile.mockResolvedValue({ client: { auth: { getUser }, rpc, from } });
});
afterEach(() => vi.unstubAllEnvs());

describe("socialEmailGuard", () => {
  it.each(["kakao", "custom:naver"])("requires confirmed email for %s", async (provider) => {
    const missingEmail = socialEmailGuard({ app_metadata: { provider } }, "/result?analysisRunId=kept&source=twa");
    expect(missingEmail?.status).toBe(403);
    const body = await missingEmail!.json();
    expect(body.code).toBe("EMAIL_CONFIRMATION_REQUIRED");
    expect(body.error).toContain("내 계정 → 이메일 확인");
    const confirmation = new URL(body.confirmationPath, "https://mooaresume.com");
    expect(confirmation.pathname).toBe("/auth/complete-profile");
    expect(confirmation.searchParams.get("next")).toBe("/result?analysisRunId=kept&source=twa");
    expect(socialEmailGuard({ email: "user@example.com", app_metadata: { provider } }, "/resume")?.status).toBe(403);
    expect(socialEmailGuard({ email: " ", email_confirmed_at: "2026-11-11T00:00:00Z", app_metadata: { provider } }, "/resume")?.status).toBe(403);
    expect(socialEmailGuard({ email: "user@example.com", email_confirmed_at: "2026-11-11T00:00:00Z", app_metadata: { provider } }, "/resume")).toBeNull();
  });

  it("recognizes configured Naver identifiers and providers arrays independent of display flags", () => {
    vi.stubEnv("NEXT_PUBLIC_NAVER_AUTH_PROVIDER", "custom:naver-kr");
    vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_ENABLED", "false");
    expect(socialEmailGuard({ app_metadata: { provider: "custom:naver-kr" } }, "/resume")?.status).toBe(403);
    expect(socialEmailGuard({ app_metadata: { provider: "email", providers: ["email", "custom:naver-kr"] } }, "/resume")?.status).toBe(403);
    expect(socialEmailGuard({ app_metadata: { provider: "google", providers: ["google", "kakao"] } }, "/resume")?.status).toBe(403);
    expect(socialEmailGuard({ app_metadata: { provider: "custom:another-service" } }, "/resume")).toBeNull();
  });

  it("preserves legacy Google/email users and incomplete legacy mocks", () => {
    expect(socialEmailGuard({}, "/resume")).toBeNull();
    expect(socialEmailGuard({ email: "legacy@example.com" }, "/resume")).toBeNull();
    expect(socialEmailGuard({ app_metadata: { provider: "google", providers: ["google"] } }, "/resume")).toBeNull();
    expect(socialEmailGuard({ app_metadata: { provider: "email" } }, "/resume")).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_NAVER_AUTH_PROVIDER", "google");
    expect(socialEmailGuard({ app_metadata: { provider: "google" } }, "/resume")).toBeNull();
  });

  it("does not accept user-editable verification claims or provider claims", () => {
    const forgedVerification = {
      app_metadata: { provider: "kakao" }, email: "unverified@example.com",
      user_metadata: { email_verified: true, email_confirmed_at: "2026-11-11", provider: "google" },
    };
    expect(socialEmailGuard(forgedVerification, "/resume")?.status).toBe(403);
    const legacyWithMutableProvider = { app_metadata: { provider: "google" }, user_metadata: { provider: "kakao" } };
    expect(socialEmailGuard(legacyWithMutableProvider, "/resume")).toBeNull();
  });

  it("does not create external completion destinations", async () => {
    const response = socialEmailGuard({ app_metadata: { provider: "kakao" } }, "//attacker.example/collect");
    const body = await response!.json();
    expect(body.confirmationPath).toBe("/analysis/prepare#account-delivery");
  });
});

const protectedRoutes = [
  { name: "QUICK/PRO/FINAL checkout", path: "/api/checkouts/quick", handler: handleCheckoutRequest },
  { name: "resume checkout", path: "/api/resume-builds", handler: resumeCheckout },
  { name: "career-description checkout", path: "/api/career-description-builds", handler: careerDescriptionCheckout },
  { name: "portfolio checkout", path: "/api/portfolio-builds", handler: portfolioCheckout },
  { name: "career AI checkout", path: "/api/career-ai-builds", handler: careerAiCheckout },
  { name: "interview retry checkout", path: "/api/interview/retry/checkout", handler: interviewCheckout },
  { name: "web QUICK execution", path: "/api/analysis-runs/quick/execute", handler: quickExecute },
  { name: "mobile QUICK execution", path: "/api/mobile/execute", handler: quickExecute },
];

describe("interrupted social signup cannot bypass completion", () => {
  it.each(protectedRoutes)("blocks $name before paid work or RPC", async ({ path, handler }) => {
    const request = new NextRequest(`https://mooaresume.com${path}`, { method: "POST", body: "{}" });
    const response = await handler(request);
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("EMAIL_CONFIRMATION_REQUIRED");
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
    if (path === "/api/mobile/execute") expect(authenticateMobile).toHaveBeenCalledWith(request);
    expect(mobileFailure).not.toHaveBeenCalled();
  });

  it("blocks member requests before callers can create or execute work", async () => {
    const result = await guardMemberRequest(new NextRequest("https://mooaresume.com/api/legal-cases", { method: "POST" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      expect((await result.response.json()).code).toBe("EMAIL_CONFIRMATION_REQUIRED");
    }
  });

  it("retains access for legacy prepaid Google members and verified new providers", async () => {
    const request = new NextRequest("https://mooaresume.com/api/legal-cases", { method: "POST" });
    getUser.mockResolvedValue({ data: { user: { id: "legacy", email: "legacy@example.com", app_metadata: { provider: "google" } } }, error: null });
    expect(await guardMemberRequest(request)).toEqual({ ok: true, userId: "legacy", email: "legacy@example.com" });
    getUser.mockResolvedValue({ data: { user: { id: "verified", email: "verified@example.com", email_confirmed_at: "2026-11-11T00:00:00Z", app_metadata: { provider: "custom:naver" } } }, error: null });
    expect(await guardMemberRequest(request)).toEqual({ ok: true, userId: "verified", email: "verified@example.com" });
  });
});

it("accepts an explicit trusted dashboard choice while preserving inline remediation", async () => {
  const id = "3b6a0483-61ba-4783-b6b9-458e2630cad1";
  const user = { id, app_metadata: { provider: "kakao", mooa_delivery_preference: { version: 1, mode: "dashboard_only", user_id: id, updated_at: "2026-11-11T00:00:00Z" } } };
  expect(socialEmailGuard(user, "/analysis/prepare")).toBeNull();
  getUser.mockResolvedValue({ data: { user }, error: null });
  expect(await guardMemberRequest(new NextRequest("https://mooaresume.com/api/legal-cases", { method: "POST" }))).toEqual({ ok: true, userId: id, email: undefined });
  const missing = socialEmailGuard({ id, app_metadata: { provider: "kakao" } }, "/analysis/prepare?product=PRO");
  expect((await missing!.json()).confirmationPath).toBe("/analysis/prepare?product=PRO#account-delivery");
});
