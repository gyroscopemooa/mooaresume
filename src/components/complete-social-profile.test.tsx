// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CompleteSocialProfile } from "./complete-social-profile";

const { getUser, updateUser, verifyOtp, signOut, signInWithOAuth, replace, refresh } = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn(), verifyOtp: vi.fn(), signOut: vi.fn(), signInWithOAuth: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getUser, updateUser, verifyOtp, signOut, signInWithOAuth } }) }));
vi.mock("next/navigation", () => { const router = { replace, refresh }; return { useRouter: () => router, useSearchParams: () => new URLSearchParams("next=%2Fresult%3FanalysisRunId%3D123") }; });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_KAKAO_LOGIN_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_ENABLED", "false");
  vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_COMING_SOON", "true");
  vi.stubEnv("NEXT_PUBLIC_NAVER_AUTH_PROVIDER", "custom:naver");
  getUser.mockResolvedValue({ data: { user: { id: "naver-user" } }, error: null });
  updateUser.mockResolvedValue({ error: null });
  verifyOtp.mockResolvedValue({ error: null });
  signOut.mockResolvedValue({ error: null });
  signInWithOAuth.mockResolvedValue({ error: null });
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

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
    await screen.findByText(/이메일 확인이 아직|로그인 계정이 바뀌었거나/);
    if (user.id !== "naver-user") expect(verifyOtp).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
  it("signs out before switching to an existing Google account", async () => {
    render(<CompleteSocialProfile />);
    await screen.findByLabelText("이메일 주소");
    fireEvent.click(screen.getByRole("button", { name: "Google로 계속하기" }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: expect.stringContaining("analysisRunId"), queryParams: { prompt: "select_account" } } }));
    expect(signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
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


it("explains the saved email without doing any account action on render", async () => {
  render(<CompleteSocialProfile />);
  await screen.findByLabelText("이메일 주소");
  expect(screen.getByText(/다음에 같은 소셜 계정으로 로그인하면 이 주소가 표시/)).toBeTruthy();
  expect(screen.getByText(/이메일을 등록하거나 바꿔도 다른 계정의 이용 내역은 합쳐지지/)).toBeTruthy();
  expect(updateUser).not.toHaveBeenCalled();
  expect(signOut).not.toHaveBeenCalled();
  expect(signInWithOAuth).not.toHaveBeenCalled();
});

it("offers a previous Kakao login with local sign-out and exact return path", async () => {
  render(<CompleteSocialProfile />);
  await screen.findByLabelText("이메일 주소");
  fireEvent.click(screen.getByRole("button", { name: "카카오로 계속하기" }));
  await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledExactlyOnceWith({ provider: "kakao", options: { redirectTo: expect.stringContaining("/auth/callback?next=%2Fresult%3FanalysisRunId%3D123") } }));
  expect(signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
  expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(signInWithOAuth.mock.invocationCallOrder[0]);
  expect(updateUser).not.toHaveBeenCalled();
});

it("keeps pending Naver isolated from sign-out, OAuth and email mutations", async () => {
  render(<CompleteSocialProfile />);
  await screen.findByLabelText("이메일 주소");
  fireEvent.click(screen.getByRole("button", { name: "네이버 로그인 준비 중" }));
  expect(screen.getByText("네이버 로그인은 준비 중입니다.")).toBeTruthy();
  expect(signOut).not.toHaveBeenCalled();
  expect(signInWithOAuth).not.toHaveBeenCalled();
  expect(updateUser).not.toHaveBeenCalled();
});

it("only offers live Naver when explicitly enabled", async () => {
  vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_ENABLED", "true");
  render(<CompleteSocialProfile />);
  await screen.findByLabelText("이메일 주소");
  fireEvent.click(screen.getByRole("button", { name: "네이버로 계속하기" }));
  await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledExactlyOnceWith({ provider: "custom:naver", options: { redirectTo: expect.stringContaining("analysisRunId") } }));
  expect(signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
});

it("blocks OAuth after a failed local sign-out and does not expose raw errors", async () => {
  signOut.mockResolvedValue({ error: { message: "private-email@example.test secret-token" } });
  render(<CompleteSocialProfile />);
  await screen.findByLabelText("이메일 주소");
  fireEvent.click(screen.getByRole("button", { name: "카카오로 계속하기" }));
  await screen.findByText(/로그인 화면을 열지 못했습니다/);
  expect(screen.queryByLabelText("이메일 주소")).toBeNull();
  expect(document.body.textContent).not.toContain("secret-token");
  expect(signInWithOAuth).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
});

it("allows retry after OAuth start fails without restoring stale email controls", async () => {
  signInWithOAuth.mockResolvedValueOnce({ error: { message: "private-token" } });
  render(<CompleteSocialProfile />);
  await screen.findByLabelText("이메일 주소");
  fireEvent.click(screen.getByRole("button", { name: "카카오로 계속하기" }));
  await screen.findByText(/로그인 화면을 열지 못했습니다/);
  expect(screen.queryByLabelText("이메일 주소")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Google로 계속하기" }));
  await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(2));
});

it("ignores repeated account switches and recovers after browser Back", async () => {
  render(<CompleteSocialProfile />);
  await screen.findByLabelText("이메일 주소");
  fireEvent.click(screen.getByRole("button", { name: "카카오로 계속하기" }));
  await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
  expect(signOut).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getAllByRole("button", { name: "이동 중..." })[0]);
  expect(signOut).toHaveBeenCalledTimes(1);
  fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));
  fireEvent.click(screen.getByRole("button", { name: "Google로 계속하기" }));
  await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(2));
});

it("does not accept an email request if the active account changed during the request", async () => {
  render(<CompleteSocialProfile />);
  fireEvent.change(await screen.findByLabelText("이메일 주소"), { target: { value: "person@example.test" } });
  getUser.mockResolvedValueOnce({ data: { user: { id: "naver-user" } }, error: null }).mockResolvedValueOnce({ data: { user: { id: "other-user" } }, error: null });
  fireEvent.click(screen.getByRole("button", { name: "확인 메일 받기" }));
  await screen.findByText(/로그인 계정이 바뀌었거나/);
  expect(screen.queryByLabelText("이메일 확인 코드")).toBeNull();
  expect(replace).not.toHaveBeenCalled();
});


it("blocks OAuth on a rejected sign-out promise and permits retry", async () => {
  signOut.mockRejectedValueOnce(new Error("private-token"));
  render(<CompleteSocialProfile />);
  await screen.findByLabelText("이메일 주소");
  fireEvent.click(screen.getByRole("button", { name: "카카오로 계속하기" }));
  await screen.findByText(/로그인 화면을 열지 못했습니다/);
  expect(signInWithOAuth).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "카카오로 계속하기" }));
  await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
  expect(signOut).toHaveBeenCalledTimes(2);
});

it("does not finish if the account changes during OTP verification", async () => {
  await sendEmail();
  verifyOtp.mockImplementation(async () => {
    getUser.mockResolvedValue({ data: { user: { id: "other-user", email: "person@example.test", email_confirmed_at: "2026-11-11" } } });
    return { error: null };
  });
  fireEvent.change(screen.getByLabelText("이메일 확인 코드"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "이메일 확인하고 계속하기" }));
  await screen.findByText(/이메일 확인이 아직/);
  expect(replace).not.toHaveBeenCalled();
});
