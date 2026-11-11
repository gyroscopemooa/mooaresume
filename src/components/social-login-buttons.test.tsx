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
  it("blocks repeated/different provider clicks while a sign-in is pending", () => {
    enableProviders();
    const signIn = vi.fn();
    render(<SocialLoginButtons onSignIn={signIn} busy />);
    screen.getAllByRole("button").forEach((button) => { expect((button as HTMLButtonElement).disabled).toBe(true); fireEvent.click(button); });
    expect(signIn).not.toHaveBeenCalled();
  });
});
