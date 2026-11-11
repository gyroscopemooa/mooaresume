// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HeaderAccount } from "./header-account";

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
