// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SocialLoginButtons } from "./social-login-buttons";

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

function enableProviders() {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_LOGIN_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_NAVER_AUTH_PROVIDER", "custom:naver");
}

describe("SocialLoginButtons", () => {
  it("hides providers that have not been activated", () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_LOGIN_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_NAVER_LOGIN_ENABLED", "false");
    render(<SocialLoginButtons onSignIn={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByText("Google로 계속하기")).toBeTruthy();
  });
  it("starts the selected provider and warns about separate existing accounts", () => {
    enableProviders();
    const signIn = vi.fn();
    render(<SocialLoginButtons onSignIn={signIn} />);
    fireEvent.click(screen.getByText("카카오로 계속하기"));
    fireEvent.click(screen.getByText("네이버로 계속하기"));
    expect(signIn.mock.calls).toEqual([["kakao"], ["custom:naver"]]);
    expect(screen.getByText(/기존 이용 내역을 유지/)).toBeTruthy();
  });
  it("uses locally hosted official brand artwork without changing accessible actions", () => {
    enableProviders();
    render(<SocialLoginButtons onSignIn={vi.fn()} />);
    const kakao = screen.getByRole("button", { name: "카카오로 계속하기" });
    const naver = screen.getByRole("button", { name: "네이버로 계속하기" });
    expect(kakao.querySelector("img")?.getAttribute("src")).toBe("/auth/kakao-login.svg");
    expect(naver.querySelector("img")?.getAttribute("src")).toBe("/auth/naver-login.png");
    expect(kakao.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(naver.querySelector("img")?.getAttribute("width")).toBe("210");
  });
  it("blocks repeated/different provider clicks while a sign-in is pending", () => {
    enableProviders();
    const signIn = vi.fn();
    render(<SocialLoginButtons onSignIn={signIn} busy />);
    screen.getAllByRole("button").forEach((button) => { expect((button as HTMLButtonElement).disabled).toBe(true); fireEvent.click(button); });
    expect(signIn).not.toHaveBeenCalled();
  });
});
