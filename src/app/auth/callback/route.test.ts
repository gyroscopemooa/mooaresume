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


it.each<Record<string, string>>([
  { error: "identity_already_exists" },
  { error: "server_error", error_code: "identity_already_exists" },
])("recognizes an already-linked provider without reflecting its description", async (params) => {
  const response = await GET(request({ ...params, error_description: "private-email@example.test secret-token", next: "/app/my" }));
  expect(response.headers.get("location")).toContain("auth_reason=identity_already_exists");
  expect(response.headers.get("location")).not.toContain("secret-token");
  expect(createClient).not.toHaveBeenCalled();
});

it("preserves an identity conflict reported by the code exchange", async () => {
  exchangeCodeForSession.mockResolvedValue({ data: { user: null }, error: { code: "identity_already_exists", message: "private-token" } });
  const response = await GET(request({ code: "single-use", next: "/app/my" }));
  expect(response.headers.get("location")).toContain("auth_reason=identity_already_exists");
  expect(response.headers.get("location")).not.toContain("private-token");
});
