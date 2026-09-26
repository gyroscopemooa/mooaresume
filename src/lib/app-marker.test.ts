// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_MARKER_ATTRIBUTE, APP_MARKER_SCRIPT, APP_MARKER_VALUE, detectTwaBillingSurface, markAppDocument } from "./app-context";
import { isGooglePlayBillingAvailable } from "./google-play/purchase";

function runScript() {
  new Function(APP_MARKER_SCRIPT)();
}

afterEach(() => {
  document.documentElement.removeAttribute(APP_MARKER_ATTRIBUTE);
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("앱/모바일 웹 구분 표시(html[data-app])", () => {
  it("일반 웹 방문에는 표시를 붙이지 않는다", () => {
    window.history.replaceState(null, "", "/app");
    runScript();
    expect(document.documentElement.hasAttribute(APP_MARKER_ATTRIBUTE)).toBe(false);
  });

  it("TWA 시작 주소(?source=twa)면 표시를 붙인다", () => {
    window.history.replaceState(null, "", "/app?source=twa");
    runScript();
    expect(document.documentElement.getAttribute(APP_MARKER_ATTRIBUTE)).toBe(APP_MARKER_VALUE);
  });

  it("이 탭에 설치 앱 표시가 저장돼 있으면 주소에 표시가 없어도 붙인다", () => {
    sessionStorage.setItem("mooa:app-installed:v1", "1");
    runScript();
    expect(document.documentElement.getAttribute(APP_MARKER_ATTRIBUTE)).toBe(APP_MARKER_VALUE);
  });

  it("markAppDocument는 설치 앱에서만 표시를 붙인다", () => {
    markAppDocument(false);
    expect(document.documentElement.hasAttribute(APP_MARKER_ATTRIBUTE)).toBe(false);
    markAppDocument(true);
    expect(document.documentElement.getAttribute(APP_MARKER_ATTRIBUTE)).toBe(APP_MARKER_VALUE);
  });
});

describe("일반 Android Chrome 탭은 Play 결제 기능이 있어도 앱이 아니다", () => {
  const win = window as unknown as Record<string, unknown>;

  afterEach(() => {
    delete win.getDigitalGoodsService;
    vi.unstubAllGlobals();
  });

  function stubDisplayMode(active: string | null) {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: active !== null && query === `(display-mode: ${active})` }));
  }

  it("Digital Goods만 있고 display-mode가 browser면 표시도, 앱 판정도 없다", () => {
    win.getDigitalGoodsService = () => Promise.resolve({});
    stubDisplayMode(null);
    runScript();
    expect(document.documentElement.hasAttribute(APP_MARKER_ATTRIBUTE)).toBe(false);
    expect(detectTwaBillingSurface()).toBe(false);
    expect(isGooglePlayBillingAvailable()).toBe(false);
  });

  it("앱 창(standalone)에서 Digital Goods가 있으면 앱으로 본다", () => {
    win.getDigitalGoodsService = () => Promise.resolve({});
    stubDisplayMode("standalone");
    runScript();
    expect(document.documentElement.getAttribute(APP_MARKER_ATTRIBUTE)).toBe(APP_MARKER_VALUE);
    expect(detectTwaBillingSurface()).toBe(true);
  });

  it("앱 시작 표시(?source=twa)가 이미 있으면 Play 결제를 쓴다", () => {
    win.getDigitalGoodsService = () => Promise.resolve({});
    stubDisplayMode(null);
    sessionStorage.setItem("mooa:app-installed:v1", "1");
    expect(isGooglePlayBillingAvailable()).toBe(true);
  });
});
