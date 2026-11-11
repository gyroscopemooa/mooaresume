// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AuthCallbackNotice } from "./auth-callback-notice";
import { getAuthCallbackMessage } from "@/lib/auth/callback-message";

afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });
describe("callback notice", () => {
  it("shows account conflict safely and dismisses only auth query values", async () => {
    window.history.replaceState(null, "", "/result?analysisRunId=123&auth_reason=identity_already_exists&auth_error=private-token");
    render(<AuthCallbackNotice />);
    expect(await screen.findByText(/다른 계정에 연결되어/)).toBeTruthy();
    expect(screen.queryByText(/private-token/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "로그인 알림 닫기" }));
    expect(window.location.search).toBe("?analysisRunId=123");
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("ignores arbitrary callback reasons", () => {
    expect(getAuthCallbackMessage("private provider details")).toBeNull();
    expect(getAuthCallbackMessage("provider_cancelled")).toContain("취소");
  });
});
