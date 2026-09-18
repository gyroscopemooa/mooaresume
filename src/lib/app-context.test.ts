import { describe, expect, it } from "vitest";
import { isAppShellPath, isTwaLaunch, syncAppContext } from "./app-context";

function storage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return { map, getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
}

describe("app context", () => {
  it("recognises a TWA launch by start url or referrer", () => {
    expect(isTwaLaunch({ search: "?source=twa", referrer: "" })).toBe(true);
    expect(isTwaLaunch({ search: "", referrer: "android-app://com.mooaresume.twa" })).toBe(true);
    expect(isTwaLaunch({ search: "?source=ad", referrer: "https://www.google.com/" })).toBe(false);
    // 다른 앱이 보낸 방문은 우리 앱이 아닙니다.
    expect(isTwaLaunch({ search: "", referrer: "android-app://com.example.other" })).toBe(false);
  });

  it("remembers the installed-app launch for later navigations in the same tab", () => {
    const session = storage();
    const launch = syncAppContext({ pathname: "/app", search: "?source=twa", referrer: "", hasDigitalGoods: false, storage: session });
    expect(launch).toEqual({ installed: true, shell: true });

    // 로그인 복귀처럼 referrer가 바뀐 다음 화면에서도 앱으로 봅니다.
    const later = syncAppContext({ pathname: "/analysis/prepare", search: "", referrer: "https://accounts.google.com/", hasDigitalGoods: false, storage: session });
    expect(later.installed).toBe(true);
  });

  it("shows the app shell for a browser visit to /app without treating it as the installed app", () => {
    const session = storage();
    const visit = syncAppContext({ pathname: "/app", search: "", referrer: "https://www.google.com/", hasDigitalGoods: false, storage: session });
    // 브라우저에서 /app을 연 웹 손님입니다 — 하단 탭은 보여 주고, 결제는
    // 기존 웹(Polar) 경로를 그대로 쓸 수 있어야 합니다.
    expect(visit).toEqual({ installed: false, shell: true });

    const nextPage = syncAppContext({ pathname: "/resume", search: "", referrer: "", hasDigitalGoods: false, storage: session });
    expect(nextPage).toEqual({ installed: false, shell: true });
  });

  it("treats a tab that exposes Play billing as the installed app", () => {
    expect(syncAppContext({ pathname: "/quick", search: "", referrer: "", hasDigitalGoods: true, storage: storage() }))
      .toEqual({ installed: true, shell: true });
  });

  it("stays a plain web visit elsewhere on the site", () => {
    expect(syncAppContext({ pathname: "/quick", search: "", referrer: "", hasDigitalGoods: false, storage: storage() }))
      .toEqual({ installed: false, shell: false });
  });

  it("survives a browser that refuses session storage", () => {
    const blocked = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    };
    expect(syncAppContext({ pathname: "/app", search: "", referrer: "", hasDigitalGoods: false, storage: blocked }))
      .toEqual({ installed: false, shell: true });
  });

  it("knows which paths belong to the app shell", () => {
    expect(isAppShellPath("/app")).toBe(true);
    expect(isAppShellPath("/app/my")).toBe(true);
    expect(isAppShellPath("/application")).toBe(false);
  });
});
