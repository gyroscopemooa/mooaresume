// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResultSignIn } from "./result-sign-in";
const { signOut, signInWithOAuth } = vi.hoisted(() => ({ signOut: vi.fn(), signInWithOAuth: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut, signInWithOAuth } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_KAKAO_LOGIN_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_NAVER_AUTH_PROVIDER", "custom:naver");
  signOut.mockResolvedValue({ error: null });
  signInWithOAuth.mockResolvedValue({ error: null });
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("result provider switching", () => {
  it.each([["Google", "google", "select_account"], ["카카오", "kakao", "login"]])("requests explicit %s reauthentication and preserves result", async (label, provider, prompt) => {
    render(<ResultSignIn nextPath="/result?analysisRunId=123" variant="missing" />);
    fireEvent.click(screen.getByRole("button", { name: `${label}로 계속하기` }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith({ provider, options: { redirectTo: expect.stringContaining("next=%2Fresult%3FanalysisRunId%3D123"), queryParams: { prompt } } }));
    expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(signInWithOAuth.mock.invocationCallOrder[0]);
  });
  it("does not sign out or start OAuth when unavailable Naver is clicked", () => {
    vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_COMING_SOON", "true");
    render(<ResultSignIn nextPath="/result?analysisRunId=123" variant="missing" />);
    fireEvent.click(screen.getByRole("button", { name: "네이버 로그인 준비 중" }));
    expect(screen.getByRole("status").textContent).toContain("준비 중");
    expect(signOut).not.toHaveBeenCalled();
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });
  it("does not start another provider when signout fails", async () => {
    signOut.mockResolvedValue({ error: { message: "offline" } });
    render(<ResultSignIn nextPath="/result?analysisRunId=123" variant="missing" />);
    fireEvent.click(screen.getByRole("button", { name: "네이버로 계속하기" }));
    await screen.findByText(/로그인 화면을 열지 못했습니다/);
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });
});
