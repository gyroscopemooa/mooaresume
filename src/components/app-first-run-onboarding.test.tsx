// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppFirstRunOnboarding, AppIntroReplayButton } from "./app-first-run-onboarding";

vi.mock("@/lib/app-context", () => ({ isInstalledAppContext: () => true }));

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); } });
});

afterAll(() => {
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShowModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("app first-run introduction", () => {
  it("opens once, and bottom skip prevents the next automatic appearance", async () => {
    const first = render(<AppFirstRunOnboarding />);
    expect(await screen.findByRole("dialog", { name: "무아레쥬메 시작하기" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    expect(window.localStorage.getItem("mooa:app-intro:20260923:completed")).toBe("1");
    first.unmount();

    render(<AppFirstRunOnboarding />);
    await new Promise((resolve) => window.setTimeout(resolve, 5));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("allows a replay from My page after the one-time introduction is completed", () => {
    window.localStorage.setItem("mooa:app-intro:20260923:completed", "1");
    render(<AppIntroReplayButton />);
    fireEvent.click(screen.getByRole("button", { name: "앱 소개 영상 다시 보기" }));
    expect(screen.getByRole("dialog", { name: "무아레쥬메 시작하기" })).toBeTruthy();
  });
});
