// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CompleteSocialProfile } from "./complete-social-profile";

const { getUser, updateUser, verifyOtp, signOut, signInWithOAuth, replace, refresh } = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn(), verifyOtp: vi.fn(), signOut: vi.fn(), signInWithOAuth: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getUser, updateUser, verifyOtp, signOut, signInWithOAuth } }) }));
vi.mock("next/navigation", () => { const router = { replace, refresh }; return { useRouter: () => router, useSearchParams: () => new URLSearchParams("next=%2Fresult%3FanalysisRunId%3D123") }; });

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "naver-user" } }, error: null });
  updateUser.mockResolvedValue({ error: null });
  verifyOtp.mockResolvedValue({ error: null });
  signOut.mockResolvedValue({ error: null });
  signInWithOAuth.mockResolvedValue({ error: null });
});
afterEach(cleanup);

async function sendEmail() {
  render(<CompleteSocialProfile />);
  const email = await screen.findByLabelText("이메일 주소");
  fireEvent.change(email, { target: { value: "person@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "확인 메일 받기" }));
  await screen.findByLabelText("이메일 확인 코드");
}

describe("email completion for social accounts", () => {
  it("sends confirmation without treating email input as verified or creating users", async () => {
    await sendEmail();
    expect(updateUser).toHaveBeenCalledWith({ email: "person@example.test" }, { emailRedirectTo: expect.stringContaining("/auth/callback?next=%2Fresult%3FanalysisRunId%3D123") });
    expect(replace).not.toHaveBeenCalled();
  });
  it("keeps the page on an unconfirmed email even after OTP success", async () => {
    await sendEmail();
    fireEvent.change(screen.getByLabelText("이메일 확인 코드"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "이메일 확인하고 계속하기" }));
    await screen.findByText(/이메일 확인이 아직/);
    expect(verifyOtp).toHaveBeenCalledWith({ email: "person@example.test", token: "123456", type: "email_change" });
    expect(replace).not.toHaveBeenCalled();
  });
  it("returns to the exact result after server-confirmed email", async () => {
    await sendEmail();
    getUser.mockResolvedValue({ data: { user: { id: "naver-user", email: "person@example.test", email_confirmed_at: "2026-11-11" } } });
    fireEvent.change(screen.getByLabelText("이메일 확인 코드"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "이메일 확인하고 계속하기" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/result?analysisRunId=123"));
  });
  it("does not replace/merge an existing account after email conflict", async () => {
    updateUser.mockResolvedValue({ error: { message: "already registered" } });
    render(<CompleteSocialProfile />);
    fireEvent.change(await screen.findByLabelText("이메일 주소"), { target: { value: "existing@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "확인 메일 받기" }));
    await screen.findByText(/기존 로그인 방법을 이용/);
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
  it.each([
    { id: "different-user", email: "person@example.test", email_confirmed_at: "2026-11-11" },
    { id: "naver-user", email: "different@example.test", email_confirmed_at: "2026-11-11" },
  ])("does not finish for a different user or confirmed email", async (user) => {
    await sendEmail();
    getUser.mockResolvedValue({ data: { user } });
    fireEvent.change(screen.getByLabelText("이메일 확인 코드"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "이메일 확인하고 계속하기" }));
    await screen.findByText(/이메일 확인이 아직/);
    expect(replace).not.toHaveBeenCalled();
  });
  it("signs out before switching to an existing Google account", async () => {
    render(<CompleteSocialProfile />);
    await screen.findByLabelText("이메일 주소");
    fireEvent.click(screen.getByRole("button", { name: "기존 Google 계정으로 로그인" }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: expect.stringContaining("analysisRunId"), queryParams: { prompt: "select_account" } } }));
    expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(signInWithOAuth.mock.invocationCallOrder[0]);
  });
});

it("restores the server pending email after reload without resending", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "naver-user", new_email: "pending@example.test" } } });
  render(<CompleteSocialProfile />);
  expect(await screen.findByLabelText("이메일 확인 코드")).toBeTruthy();
  expect((screen.getByLabelText("이메일 주소") as HTMLInputElement).value).toBe("pending@example.test");
  expect(updateUser).not.toHaveBeenCalled();
});
