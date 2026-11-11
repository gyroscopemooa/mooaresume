// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AccountEmailPanel } from "./account-email-panel";

const { getUser, updateUser, verifyOtp, resend } = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn(), verifyOtp: vi.fn(), resend: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getUser, updateUser, verifyOtp, resend } }) }));
const initial = { id: "account-a", email: "current@example.test", email_confirmed_at: "2026-11-11", app_metadata: { provider: "google" } };
let current: { id: string; email?: string; email_confirmed_at?: string; new_email?: string; app_metadata?: { provider: string; mooa_delivery_preference?: Record<string, unknown> } } | null;

beforeEach(() => {
  vi.resetAllMocks();
  current = { ...initial };
  getUser.mockImplementation(async () => ({ data: { user: current }, error: null }));
  updateUser.mockImplementation(async ({ email }: { email: string }) => {
    if (current) current = { ...current, new_email: email };
    return { data: { user: current }, error: null };
  });
  verifyOtp.mockResolvedValue({ data: { user: null }, error: null });
  resend.mockResolvedValue({ error: null });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const panel = () => screen.getByRole("region", { name: "분석 완료 알림 이메일" });
const shownEmail = () => panel().querySelector("p")?.textContent;
async function openEditor() {
  render(<AccountEmailPanel />);
  await screen.findByText("current@example.test");
  fireEvent.click(screen.getByRole("button", { name: "변경" }));
}
async function requestChange() {
  await openEditor();
  fireEvent.change(screen.getByLabelText("사용할 이메일"), { target: { value: "new@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "확인 메일 받기" }));
  await screen.findByLabelText("이메일 확인 코드");
}
async function enterCode() {
  fireEvent.change(screen.getByLabelText("이메일 확인 코드"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "코드 확인" }));
}

describe("checkout account email", () => {
  it.each(["google", "kakao"])("shows the actual confirmed %s account email without requesting mail", async (provider) => {
    current = { ...initial, app_metadata: { provider } };
    render(<AccountEmailPanel />);
    await screen.findByText("current@example.test");
    expect(shownEmail()).toBe("current@example.test");
    expect(panel().getAttribute("data-clarity-mask")).toBe("True");
    expect(updateUser).not.toHaveBeenCalled();
    expect(resend).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("prompts for a missing address and sends only after an explicit request", async () => {
    current = { id: "account-a" };
    render(<AccountEmailPanel />);
    await screen.findByText("등록된 이메일이 없습니다.");
    expect(updateUser).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("사용할 이메일"), { target: { value: "new@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "확인 메일 받기" }));
    await screen.findByLabelText("이메일 확인 코드");
    expect(updateUser).toHaveBeenCalledWith({ email: "new@example.test" }, { emailRedirectTo: expect.stringContaining("/auth/callback?next=%2Fanalysis%2Fprepare") });
    expect(shownEmail()).toBe("등록된 이메일이 없습니다.");
  });

  it("confirms an unchanged unconfirmed email using resend, never no-op updateUser", async () => {
    current = { id: "account-a", email: "unconfirmed@example.test" };
    render(<AccountEmailPanel />);
    await screen.findByText(/아직 확인되지 않은 이메일/);
    expect(resend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "확인 메일 받기" }));
    await screen.findByLabelText("이메일 확인 코드");
    expect(resend).toHaveBeenCalledWith({ type: "signup", email: "unconfirmed@example.test", options: { emailRedirectTo: expect.stringContaining("analysis%2Fprepare") } });
    expect(updateUser).not.toHaveBeenCalled();
    verifyOtp.mockImplementation(async () => { current = { ...current!, email_confirmed_at: "2026-11-11" }; return { error: null }; });
    await enterCode();
    await screen.findByText(/이메일 확인이 완료되어/);
    expect(verifyOtp).toHaveBeenCalledWith({ email: "unconfirmed@example.test", token: "123456", type: "signup" });
  });

  it("retains the old email after request and after only one secure-change confirmation", async () => {
    await requestChange();
    expect(shownEmail()).toBe("current@example.test");
    expect(screen.getByText(/기존 주소와 새 주소 모두/)).toBeTruthy();
    await enterCode();
    await screen.findByText(/아직 변경이 완료되지 않았습니다/);
    expect(verifyOtp).toHaveBeenCalledWith({ email: "new@example.test", token: "123456", type: "email_change" });
    expect(shownEmail()).toBe("current@example.test");
    expect(screen.queryByText(/이메일 확인이 완료되어/)).toBeNull();
  });

  it("uses each code's actual recipient and succeeds only after both confirmations", async () => {
    await requestChange();
    await enterCode();
    await screen.findByText(/아직 변경이 완료되지 않았습니다/);
    fireEvent.change(screen.getByLabelText("코드를 받은 주소"), { target: { value: "current" } });
    verifyOtp.mockImplementation(async () => { current = { ...initial, email: "new@example.test" }; return { error: null }; });
    await enterCode();
    await screen.findByText(/이메일 확인이 완료되어/);
    expect(verifyOtp).toHaveBeenLastCalledWith({ email: "current@example.test", token: "123456", type: "email_change" });
    expect(shownEmail()).toBe("new@example.test");
    expect(screen.queryByLabelText("이메일 확인 코드")).toBeNull();
  });

  it.each([
    { ...initial, email: "new@example.test", email_confirmed_at: undefined },
    { ...initial, email: "different@example.test" },
  ])("rejects a nonmatching or unconfirmed post-OTP email", async (result) => {
    await requestChange();
    verifyOtp.mockImplementation(async () => { current = result; return { error: null }; });
    await enterCode();
    await screen.findByText(/아직 변경이 완료되지 않았습니다/);
    expect(screen.queryByText(/이메일 확인이 완료되어/)).toBeNull();
  });

  it("checks UUID before sending and never modifies a stale account", async () => {
    await openEditor();
    current = { ...initial, id: "account-b" };
    fireEvent.change(screen.getByLabelText("사용할 이메일"), { target: { value: "new@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "확인 메일 받기" }));
    await screen.findByText(/로그인 계정이 바뀌었거나/);
    expect(updateUser).not.toHaveBeenCalled();
    expect(resend).not.toHaveBeenCalled();
    expect(screen.queryByText("current@example.test")).toBeNull();
  });

  it("checks UUID before OTP verification, not just afterward", async () => {
    await requestChange();
    current = { ...current!, id: "account-b" };
    await enterCode();
    await screen.findByText(/로그인 계정이 바뀌었거나/);
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("does not report success if the account changes during OTP verification", async () => {
    await requestChange();
    verifyOtp.mockImplementation(async () => { current = { ...initial, id: "account-b", email: "new@example.test" }; return { error: null }; });
    await enterCode();
    await screen.findByText(/로그인 계정이 바뀌었거나/);
    expect(screen.queryByText(/이메일 확인이 완료되어/)).toBeNull();
  });

  it("rejects superseded pending requests before OTP", async () => {
    await requestChange();
    current = { ...current!, new_email: "another@example.test" };
    await enterCode();
    await screen.findByText(/변경 요청이 달라졌습니다/);
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it.each(["invalid", "two@@example.test", "bad @example.test"])("rejects invalid input %s without sending", async (value) => {
    await openEditor();
    fireEvent.change(screen.getByLabelText("사용할 이메일"), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "확인 메일 받기" }));
    await screen.findByText("확인 가능한 이메일 주소를 입력해 주세요.");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("handles conflicts safely without changing current email or attempting linking", async () => {
    updateUser.mockResolvedValue({ error: { message: "email already registered" } });
    await openEditor();
    fireEvent.change(screen.getByLabelText("사용할 이메일"), { target: { value: "existing@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "확인 메일 받기" }));
    await screen.findByText(/다른 계정에서 사용하는 이메일/);
    expect(shownEmail()).toBe("current@example.test");
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("handles expired OTP and explicit resend without treating it as completion", async () => {
    await requestChange();
    verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    await enterCode();
    await screen.findByText(/코드가 올바르지 않거나/);
    fireEvent.click(screen.getByRole("button", { name: "확인 메일 다시 받기" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(2));
    expect(shownEmail()).toBe("current@example.test");
  });

  it("does not duplicate a send when clicked repeatedly", async () => {
    let resolve!: (result: { error: null }) => void;
    updateUser.mockImplementation(() => new Promise((done) => { resolve = done; }));
    await openEditor();
    fireEvent.change(screen.getByLabelText("사용할 이메일"), { target: { value: "new@example.test" } });
    const form = screen.getByLabelText("사용할 이메일").closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(1));
    await act(async () => resolve({ error: null }));
    expect(updateUser).toHaveBeenCalledTimes(1);
  });

  it("restores pending email on mount without sending and supports close/reopen", async () => {
    current = { ...initial, new_email: "pending@example.test" };
    render(<AccountEmailPanel />);
    await screen.findByLabelText("이메일 확인 코드");
    expect(shownEmail()).toBe("current@example.test");
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByLabelText("이메일 확인 코드")).toBeNull();
    expect(screen.getByText(/확인 대기:/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "변경" }));
    expect(screen.getByLabelText("이메일 확인 코드")).toBeTruthy();
    expect(updateUser).not.toHaveBeenCalled();
    expect(resend).not.toHaveBeenCalled();
  });

  it.each(["focus", "pageshow"])("refreshes safely after link confirmation on %s without sending", async (event) => {
    await requestChange();
    current = { ...initial, email: "new@example.test" };
    fireEvent(window, new Event(event));
    await screen.findByText(/이메일 확인이 완료되어/);
    expect(shownEmail()).toBe("new@example.test");
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("keeps pending after a read error and supports explicit retry", async () => {
    await requestChange();
    getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: "network" } });
    fireEvent.click(screen.getByRole("button", { name: "메일 확인 후 새로 확인" }));
    await screen.findByText(/로그인 정보를 확인하지 못했습니다/);
    expect(shownEmail()).toBe("current@example.test");
    current = { ...initial, email: "new@example.test" };
    fireEvent.click(screen.getByRole("button", { name: "메일 확인 후 새로 확인" }));
    await screen.findByText(/이메일 확인이 완료되어/);
  });

  it("locks mutations during checkout or an active run", async () => {
    current = { ...initial, new_email: "pending@example.test" };
    render(<AccountEmailPanel locked />);
    await screen.findByLabelText("이메일 확인 코드");
    for (const name of ["확인 메일 받기", "확인 메일 다시 받기", "코드 확인"]) {
      expect((within(panel()).getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    }
    expect(updateUser).not.toHaveBeenCalled();
  });
});

it("preserves an unsent draft and the open editor on focus", async () => {
  await openEditor();
  fireEvent.change(screen.getByLabelText("사용할 이메일"), { target: { value: "draft@example.test" } });
  const reads = getUser.mock.calls.length;
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(getUser.mock.calls.length).toBeGreaterThan(reads));
  expect((screen.getByLabelText("사용할 이메일") as HTMLInputElement).value).toBe("draft@example.test");
  expect(screen.getByRole("button", { name: "닫기" })).toBeTruthy();
  expect(updateUser).not.toHaveBeenCalled();
});

it("does not expose arbitrary rejected auth errors on mount or refresh", async () => {
  getUser.mockRejectedValueOnce(new Error("private-person@example.test secret-response-token"));
  render(<AccountEmailPanel />);
  await screen.findByText("로그인 정보를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.");
  expect(panel().textContent).not.toContain("private-person");
  expect(panel().textContent).not.toContain("secret-response");
  fireEvent.click(screen.getByRole("button", { name: "이메일 정보 다시 확인" }));
  await screen.findByText("current@example.test");
  getUser.mockRejectedValueOnce(new Error("private-refresh@example.test"));
  fireEvent(window, new Event("focus"));
  await screen.findByText("로그인 정보를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.");
  expect(panel().textContent).not.toContain("private-refresh");
});

it("does not send again to the already confirmed current address", async () => {
  await openEditor();
  fireEvent.click(screen.getByRole("button", { name: "확인 메일 받기" }));
  await screen.findByText("이미 현재 계정에 적용된 이메일입니다.");
  expect(updateUser).not.toHaveBeenCalled();
  expect(resend).not.toHaveBeenCalled();
});

it("does not present a pending change after an account switch during send", async () => {
  updateUser.mockImplementation(async () => { current = { ...initial, id: "account-b" }; return { error: null }; });
  await openEditor();
  fireEvent.change(screen.getByLabelText("사용할 이메일"), { target: { value: "new@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "확인 메일 받기" }));
  await screen.findByText(/로그인 계정이 바뀌었거나/);
  expect(screen.queryByLabelText("이메일 확인 코드")).toBeNull();
});


it("explains email changes keep social login and do not merge accounts before editing", async () => {
  render(<AccountEmailPanel />);
  await screen.findByText("current@example.test");
  expect(screen.getByText(/계정·알림 이메일과 소셜 로그인은 별개/)).toBeTruthy();
  expect(screen.getByText(/이메일을 바꿔도 연결된 소셜 로그인은 유지/)).toBeTruthy();
  expect(updateUser).not.toHaveBeenCalled();
  expect(verifyOtp).not.toHaveBeenCalled();
});

const dashboardPreference = () => ({ version: 1, mode: "dashboard_only", user_id: "account-a", updated_at: "2026-11-11T00:00:00Z" });
const dashboardChoice = () => screen.getByRole("checkbox", { name: /추가 이메일 인증 없이/ }) as HTMLInputElement;

describe("explicit dashboard-only service delivery", () => {
  it.each(["google", "email"])("does not offer the choice for %s-only accounts", async (provider) => {
    current = { ...initial, app_metadata: { provider } };
    render(<AccountEmailPanel />);
    await screen.findByText("current@example.test");
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
  it.each(["kakao", "custom:naver"])("persists explicit %s choice without sending mail or changing account email", async (provider) => {
    current = { id: "account-a", app_metadata: { provider } };
    const ready = vi.fn();
    const send = vi.fn().mockImplementation(async (_url, options) => {
      expect(JSON.parse(options.body)).toEqual({ userId: "account-a", dashboardOnly: true });
      current = { ...current!, app_metadata: { provider, mooa_delivery_preference: dashboardPreference() } };
      return { ok: true, json: async () => ({ userId: "account-a", ready: true }) };
    });
    vi.stubGlobal("fetch", send);
    render(<AccountEmailPanel onReadinessChange={ready} />);
    await screen.findByText("등록된 이메일이 없습니다.");
    expect(ready).toHaveBeenLastCalledWith({ userId: "account-a", ready: false });
    fireEvent.click(dashboardChoice());
    await screen.findByText(/대시보드 전용으로 저장했습니다/);
    expect(dashboardChoice().checked).toBe(true);
    expect(ready).toHaveBeenLastCalledWith({ userId: "account-a", ready: true });
    expect(updateUser).not.toHaveBeenCalled(); expect(resend).not.toHaveBeenCalled(); expect(verifyOtp).not.toHaveBeenCalled();
  });
  it("keeps verified email and pending change when opting out", async () => {
    current = { ...initial, new_email: "pending@example.test", app_metadata: { provider: "kakao" } };
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
      current = { ...current!, app_metadata: { provider: "kakao", mooa_delivery_preference: dashboardPreference() } };
      return { ok: true, json: async () => ({ userId: "account-a" }) };
    }));
    render(<AccountEmailPanel />); await screen.findByText("current@example.test");
    fireEvent.click(dashboardChoice()); await screen.findByText(/대시보드 전용으로 저장했습니다/);
    expect(current?.email).toBe(initial.email); expect(current?.new_email).toBe("pending@example.test");
    expect(screen.getByText(/확인 대기:/).textContent).toContain("pending@example.test");
    expect(updateUser).not.toHaveBeenCalled();
  });
  it("keeps dashboard-only enabled until a real confirmed email exists", async () => {
    current = { id: "account-a", app_metadata: { provider: "kakao", mooa_delivery_preference: dashboardPreference() } };
    const send = vi.fn(); vi.stubGlobal("fetch", send);
    render(<AccountEmailPanel />); await screen.findByText("등록된 이메일이 없습니다.");
    fireEvent.click(dashboardChoice()); await screen.findByText(/알림을 다시 받으려면/);
    expect(dashboardChoice().checked).toBe(true); expect(send).not.toHaveBeenCalled();
    expect(screen.getByLabelText("사용할 이메일")).toBeTruthy();
  });
  it("does not optimistically allow checkout when save fails, and supports retry", async () => {
    current = { id: "account-a", app_metadata: { provider: "kakao" } };
    const send = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }); vi.stubGlobal("fetch", send);
    const ready = vi.fn(); render(<AccountEmailPanel onReadinessChange={ready} />);
    await screen.findByText("등록된 이메일이 없습니다."); fireEvent.click(dashboardChoice());
    await screen.findByText(/이용 방식을 저장하지 못했습니다/);
    expect(dashboardChoice().checked).toBe(false); expect(ready).toHaveBeenLastCalledWith({ userId: "account-a", ready: false });
    fireEvent.click(dashboardChoice()); await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  });
  it("ignores repeated clicks and rejects a changed UUID after persistence", async () => {
    current = { id: "account-a", app_metadata: { provider: "kakao" } };
    let resolve!: (value: unknown) => void;
    const send = vi.fn().mockImplementation(() => new Promise((done) => { resolve = done; })); vi.stubGlobal("fetch", send);
    const ready = vi.fn(); render(<AccountEmailPanel onReadinessChange={ready} />); await screen.findByText("등록된 이메일이 없습니다.");
    fireEvent.click(dashboardChoice()); fireEvent.click(dashboardChoice());
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    current = { ...initial, id: "account-b" };
    await act(async () => resolve({ ok: true, json: async () => ({ userId: "account-a" }) }));
    await screen.findByText(/로그인 계정이 바뀌었거나/);
    expect(ready).toHaveBeenLastCalledWith({ userId: null, ready: false });
  });
  it("refreshes saved preference on focus and allows verified email opt-in", async () => {
    current = { ...initial, app_metadata: { provider: "kakao" } };
    render(<AccountEmailPanel />); await screen.findByText("current@example.test");
    current = { ...current, app_metadata: { provider: "kakao", mooa_delivery_preference: dashboardPreference() } };
    fireEvent(window, new Event("focus")); await waitFor(() => expect(dashboardChoice().checked).toBe(true));
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
      current = { ...current!, app_metadata: { provider: "kakao", mooa_delivery_preference: { ...dashboardPreference(), mode: "email" } } };
      return { ok: true, json: async () => ({ userId: "account-a" }) };
    }));
    fireEvent.click(dashboardChoice()); await screen.findByText("확인된 계정 이메일로 서비스 알림을 받습니다.");
    expect(dashboardChoice().checked).toBe(false);
  });
});
