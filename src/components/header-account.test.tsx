// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HeaderAccount } from "./header-account";
import { AuthSessionMissingError } from "@supabase/supabase-js";

const { getUser, signInWithOAuth, linkIdentity, signOut, refresh } = vi.hoisted(() => ({ getUser: vi.fn(), signInWithOAuth: vi.fn(), linkIdentity: vi.fn(), signOut: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getUser, signInWithOAuth, linkIdentity, signOut } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_KAKAO_LOGIN_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_NAVER_AUTH_PROVIDER", "custom:naver");
  vi.stubEnv("NEXT_PUBLIC_SOCIAL_ACCOUNT_LINKING_ENABLED", "true");
  getUser.mockResolvedValue({ data: { user: null } });
  signInWithOAuth.mockResolvedValue({ error: null });
  linkIdentity.mockResolvedValue({ error: null });
  signOut.mockResolvedValue({ error: null });
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("header social login", () => {
  it("offers provider selection and closes with Escape", async () => {
    render(<HeaderAccount />);
    fireEvent.click(await screen.findByRole("button", { name: "로그인" }));
    expect(screen.getByText("네이버로 계속하기")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("네이버로 계속하기")).toBeNull();
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });
  it("shows the pending choice even when Google is the only active provider", async () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_LOGIN_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_COMING_SOON", "true");
    render(<HeaderAccount />);
    fireEvent.click(await screen.findByRole("button", { name: "로그인" }));
    fireEvent.click(screen.getByRole("button", { name: "네이버 로그인 준비 중" }));
    expect(screen.getByRole("status").textContent).toContain("준비 중");
    expect(signInWithOAuth).not.toHaveBeenCalled();
    expect(linkIdentity).not.toHaveBeenCalled();
  });
  it("never offers unavailable Naver as an account-linking action", async () => {
    vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_COMING_SOON", "true");
    getUser.mockResolvedValue({ data: { user: { id: "existing-user", email: "person@example.test", identities: [{ provider: "google" }] } } });
    render(<HeaderAccount />);
    fireEvent.click(await screen.findByRole("button", { name: "내 계정" }));
    expect(screen.queryByRole("button", { name: "네이버 계정 연결" })).toBeNull();
    expect(screen.getByRole("button", { name: "카카오 계정 연결" })).toBeTruthy();
    expect(linkIdentity).not.toHaveBeenCalled();
  });
  it("keeps email-less users signed in and offers sign-out", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "naver-user", identities: [{ provider: "custom:naver" }] } } });
    render(<HeaderAccount />);
    fireEvent.click(await screen.findByRole("button", { name: "내 계정" }));
    expect(screen.getByText("이메일 확인 필요")).toBeTruthy();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "네이버 계정 연결" })).toBeNull();
  });
  it("links Naver on the current account instead of creating a new session", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "existing-user", email: "person@example.test", identities: [{ provider: "google" }] } } });
    render(<HeaderAccount />);
    fireEvent.click(await screen.findByRole("button", { name: "내 계정" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "네이버 계정 연결" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "네이버 계정 연결" }));
    await waitFor(() => expect(linkIdentity).toHaveBeenCalledWith({ provider: "custom:naver", options: { redirectTo: expect.stringContaining("/auth/callback?next=") } }));
    expect(signInWithOAuth).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
  it("does not advertise linking until the server setting is ready", async () => {
    vi.stubEnv("NEXT_PUBLIC_SOCIAL_ACCOUNT_LINKING_ENABLED", "false");
    getUser.mockResolvedValue({ data: { user: { id: "existing-user", email: "person@example.test" } } });
    render(<HeaderAccount />);
    fireEvent.click(await screen.findByRole("button", { name: "내 계정" }));
    expect(screen.queryByText(/계정 연결/)).toBeNull();
  });
});

it("allows another attempt when browser Back restores a pending login", async () => {
  render(<HeaderAccount />);
  fireEvent.click(await screen.findByRole("button", { name: "로그인" }));
  fireEvent.click(screen.getByRole("button", { name: "카카오로 계속하기" }));
  await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
  fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));
  fireEvent.click(screen.getByRole("button", { name: "네이버로 계속하기" }));
  await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(2));
});


it("labels the saved email separately from the linked Naver identity", async () => {
  vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_ENABLED", "false");
  vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_COMING_SOON", "true");
  getUser.mockResolvedValue({ data: { user: { id: "naver-user", email: "example+sample@gmail.com", email_confirmed_at: "2026-11-11", identities: [{ provider: "custom:naver" }, { provider: "email" }] } } });
  render(<HeaderAccount />);
  fireEvent.click(await screen.findByRole("button", { name: "내 계정" }));
  expect(screen.getByText("계정·알림 이메일")).toBeTruthy();
  expect(screen.getByText("연결된 소셜 로그인: 네이버")).toBeTruthy();
  expect(screen.getByText("example+sample@gmail.com").closest("[data-clarity-mask]")).toBeTruthy();
  expect(screen.queryByText(/연결된 소셜 로그인:.*Google/)).toBeNull();
  expect(screen.queryByRole("button", { name: "네이버 계정 연결" })).toBeNull();
  expect(signInWithOAuth).not.toHaveBeenCalled();
  expect(linkIdentity).not.toHaveBeenCalled();
});

it("does not infer Google login from a Gmail account address", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "email-user", email: "example@gmail.com", identities: [{ provider: "email" }] } } });
  render(<HeaderAccount />);
  fireEvent.click(await screen.findByRole("button", { name: "내 계정" }));
  expect(screen.queryByText(/연결된 소셜 로그인:/)).toBeNull();
});

it("explains an already-linked identity without changing session or exposing error text", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "main-user", email: "main@example.test", identities: [{ provider: "google" }] } } });
  linkIdentity.mockResolvedValue({ error: { code: "identity_already_exists", message: "private-account@example.test secret-token" } });
  render(<HeaderAccount />);
  fireEvent.click(await screen.findByRole("button", { name: "내 계정" }));
  await waitFor(() => expect((screen.getByRole("button", { name: "네이버 계정 연결" }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "네이버 계정 연결" }));
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain("이미 다른 계정에 연결되어");
  expect(alert.textContent).toContain("이메일을 바꿔도");
  expect(alert.textContent).not.toContain("secret-token");
  expect(signOut).not.toHaveBeenCalled();
  expect(signInWithOAuth).not.toHaveBeenCalled();
});


it("refreshes email and linked identities on menu open without mutating the account", async () => {
  getUser.mockResolvedValueOnce({ data: { user: { id: "same-user", email: "old@example.test", identities: [{ provider: "custom:naver" }] } } }).mockResolvedValue({ data: { user: { id: "same-user", email: "new@example.test", identities: [{ provider: "custom:naver" }, { provider: "google" }] } } });
  render(<HeaderAccount />);
  fireEvent.click(await screen.findByRole("button", { name: "내 계정" }));
  await screen.findByText("new@example.test");
  expect(screen.getByText("연결된 소셜 로그인: 네이버 · Google")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Google 계정 연결" })).toBeNull();
  expect(screen.queryByRole("button", { name: "네이버 계정 연결" })).toBeNull();
  expect(linkIdentity).not.toHaveBeenCalled();
  expect(signOut).not.toHaveBeenCalled();
});

it("blocks account actions after a failed refresh and allows reopening to retry", async () => {
  getUser.mockResolvedValueOnce({ data: { user: { id: "same-user", email: "saved@example.test", identities: [{ provider: "google" }] } } }).mockRejectedValueOnce(new Error("private secret"));
  render(<HeaderAccount />);
  fireEvent.click(await screen.findByRole("button", { name: "내 계정" }));
  await screen.findByText(/현재 계정 정보를 확인하지 못했습니다/);
  expect((screen.getByRole("button", { name: "카카오 계정 연결" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "로그아웃" }) as HTMLButtonElement).disabled).toBe(true);
  expect(document.body.textContent).not.toContain("private secret");
  fireEvent.click(screen.getByRole("button", { name: "내 계정" }));
  getUser.mockResolvedValue({ data: { user: { id: "same-user", email: "saved@example.test", identities: [{ provider: "google" }] } } });
  fireEvent.click(screen.getByRole("button", { name: "내 계정" }));
  await waitFor(() => expect((screen.getByRole("button", { name: "카카오 계정 연결" }) as HTMLButtonElement).disabled).toBe(false));
  expect(linkIdentity).not.toHaveBeenCalled();
  expect(signOut).not.toHaveBeenCalled();
});


it.each([new AuthSessionMissingError(), { code: "session_not_found" }])("shows login choices when the refreshed session is gone", async (error) => {
  getUser.mockResolvedValueOnce({ data: { user: { id: "previous-user", email: "saved@example.test", identities: [{ provider: "google" }] } } }).mockResolvedValue({ data: { user: null }, error });
  render(<HeaderAccount />);
  fireEvent.click(await screen.findByRole("button", { name: "내 계정" }));
  const login = await screen.findByRole("button", { name: "카카오로 계속하기" });
  await waitFor(() => expect((login as HTMLButtonElement).disabled).toBe(false));
  expect(screen.queryByRole("button", { name: "로그아웃" })).toBeNull();
  expect(signOut).not.toHaveBeenCalled();
  fireEvent.click(login);
  await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
});
