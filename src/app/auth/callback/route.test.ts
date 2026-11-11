import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const { exchangeCodeForSession, verifyOtp, createClient } = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn(), createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
const user = { id: "same-user", email: "test@example.test", email_confirmed_at: "2026-11-11" };
const request = (query: Record<string, string>) => new NextRequest(`https://mooaresume.com/auth/callback?${new URLSearchParams(query)}`);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  createClient.mockResolvedValue({ auth: { exchangeCodeForSession, verifyOtp } });
  exchangeCodeForSession.mockResolvedValue({ data: { user }, error: null });
  verifyOtp.mockResolvedValue({ data: { user }, error: null });
});
afterEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); });

describe("OAuth callback", () => {
  it("exchanges PKCE once and retains the exact requested result", async () => {
    const response = await GET(request({ code: "single-use", next: "/result?analysisRunId=abc&source=twa" }));
    expect(exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith("single-use");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://mooaresume.com/result?analysisRunId=abc&source=twa");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it.each([{ id: "naver-user" }, { ...user, email_confirmed_at: null }])("requires verified email without minting/linking another account", async (profile) => {
    exchangeCodeForSession.mockResolvedValue({ data: { user: profile }, error: null });
    const response = await GET(request({ code: "code", next: "/app/my?source=twa" }));
    const url = new URL(response.headers.get("location")!);
    expect(url.pathname).toBe("/auth/complete-profile");
    expect(url.searchParams.get("next")).toBe("/app/my?source=twa");
  });
  it("handles cancellation without reflecting upstream error details", async () => {
    const response = await GET(request({ error: "access_denied", error_description: "private-token-and-email", next: "/career/profile" }));
    const location = response.headers.get("location")!;
    expect(location).toContain("auth_reason=provider_cancelled");
    expect(location).not.toContain("private-token");
    expect(createClient).not.toHaveBeenCalled();
  });
  it("does not redirect to another origin through backslashes", async () => {
    const response = await GET(request({ code: "code", next: "/\\evil.test" }));
    expect(response.headers.get("location")).toBe("https://mooaresume.com/analysis/prepare");
  });
  it("fails safely when the session exchange throws", async () => {
    exchangeCodeForSession.mockRejectedValue(new Error("private secret"));
    const response = await GET(request({ code: "code", next: "/app/my" }));
    expect(response.headers.get("location")).toContain("auth_reason=session_failed");
    expect(response.headers.get("location")).not.toContain("secret");
  });
  it.each(["email", "magiclink", "email_change"])("retains %s email confirmation support", async (type) => {
    const response = await GET(request({ token_hash: "hash", type, next: "/career/profile" }));
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "hash", type });
    expect(response.headers.get("location")).toBe("https://mooaresume.com/career/profile");
  });
  it("rejects arbitrary OTP types", async () => {
    const response = await GET(request({ token_hash: "hash", type: "sms" }));
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("auth_reason=invalid_type");
  });
});
