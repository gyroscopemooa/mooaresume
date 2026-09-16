// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HomePromoVideo } from "./home-promo-video";

const videoLabel = "무아레쥬메 60초 세로 소개 영상";
const pendingFrames = new Map<number, FrameRequestCallback>();
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
let frameId = 0;
let reducedMotion = false;

// jsdom cannot implement the browser's modal top layer. Browser QA covers focus
// containment; these shims preserve open/close behavior for lifecycle checks.
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
});

afterAll(() => {
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShowModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

beforeEach(() => {
  pendingFrames.clear();
  reducedMotion = false;
  window.sessionStorage.clear();
  document.documentElement.style.overflow = "auto";
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
    pendingFrames.set(++frameId, callback);
    return frameId;
  }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => pendingFrames.delete(id)));
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: reducedMotion, media: query })));
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.style.overflow = "";
});

function nextFrame() {
  act(() => {
    const callbacks = [...pendingFrames.values()];
    pendingFrames.clear();
    callbacks.forEach((callback) => callback(0));
  });
}

function openOnArrival() {
  const result = render(<HomePromoVideo />);
  nextFrame();
  return result;
}

function getVideo() {
  return screen.getByLabelText<HTMLVideoElement>(videoLabel);
}

describe("homepage introduction video", () => {
  it("opens after arrival with muted inline playback and native playback controls", () => {
    render(<HomePromoVideo />);
    expect(screen.queryByLabelText(videoLabel)).toBeNull();
    nextFrame();

    expect(screen.getByRole("dialog", { name: "무아레쥬메, 60초 소개" })).toBeTruthy();
    const video = getVideo();
    expect(video.muted).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.controls).toBe(true);
    expect(document.documentElement.style.overflow).toBe("hidden");
  });

  it.each(["button", "Escape", "backdrop"] as const)("dismisses through %s, stops media, and restores page scrolling", (method) => {
    openOnArrival();
    const dialog = screen.getByRole("dialog");
    const video = getVideo();

    if (method === "button") fireEvent.click(screen.getByRole("button", { name: "소개 영상 닫기" }));
    // Native browsers emit cancel when Escape is pressed; jsdom does not.
    else if (method === "Escape") fireEvent(dialog, new Event("cancel", { cancelable: true }));
    else {
      vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 100, 300, 500));
      fireEvent.click(dialog, { clientX: 50, clientY: 50 });
    }

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByLabelText(videoLabel)).toBeNull();
    expect(video.pause).toHaveBeenCalled();
    expect(document.documentElement.style.overflow).toBe("auto");
  });

  it("keeps the film closed after remount in the same tab and allows an explicit replay", () => {
    const firstVisit = openOnArrival();
    fireEvent.click(screen.getByRole("button", { name: "소개 영상 닫기" }));
    firstVisit.unmount();
    render(<HomePromoVideo />);
    nextFrame();

    expect(screen.queryByLabelText(videoLabel)).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "60초 소개 영상 보기" }));
    expect(getVideo()).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("waits for playback input when reduced motion is preferred", () => {
    reducedMotion = true;
    openOnArrival();

    expect(getVideo().autoplay).toBe(false);
    expect(getVideo().controls).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "소개 영상 닫기" }));
    fireEvent.click(screen.getByRole("button", { name: "60초 소개 영상 보기" }));
    expect(getVideo().autoplay).toBe(false);
  });

  it("can close and replay when tab storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    openOnArrival();
    expect(getVideo()).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "소개 영상 닫기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.documentElement.style.overflow).toBe("auto");
    fireEvent.click(screen.getByRole("button", { name: "60초 소개 영상 보기" }));
    expect(getVideo()).toBeTruthy();
  });

  it("stops playback and restores page scrolling when navigation unmounts the popup", () => {
    const page = openOnArrival();
    const video = getVideo();
    page.unmount();

    expect(video.pause).toHaveBeenCalled();
    expect(document.documentElement.style.overflow).toBe("auto");
  });

  it("offers retry and an exit when the video cannot load", () => {
    openOnArrival();
    fireEvent.error(getVideo());
    expect(screen.getByRole("status").textContent).toContain("영상을 불러오지 못했어요.");
    expect(screen.queryByLabelText(videoLabel)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "다시 재생하기" }));
    expect(getVideo()).toBeTruthy();
    fireEvent.error(getVideo());
    fireEvent.click(screen.getByRole("button", { name: "닫고 홈페이지 보기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.documentElement.style.overflow).toBe("auto");
  });
});
