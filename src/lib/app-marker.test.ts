// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { APP_MARKER_ATTRIBUTE, APP_MARKER_SCRIPT, APP_MARKER_VALUE, markAppDocument } from "./app-context";

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
