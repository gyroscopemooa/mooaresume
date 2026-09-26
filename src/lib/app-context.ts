/**
 * 앱(하이브리드) 안에서 열렸는지에 대한 두 가지 사실.
 *
 * 둘을 일부러 나눕니다.
 *
 * - **셸(shell)**: 이 탭이 `/app` 화면을 거쳐 왔는가. 하단 탭바를 보일지만
 *   정합니다. 일반 브라우저에서 `/app`을 연 사람도 탭바를 봅니다.
 * - **설치 앱(installed)**: Play에서 설치한 TWA(`com.mooaresume.twa`)로 실행됐는가.
 *   결제 수단을 정합니다. 앱 안에서는 디지털 상품을 Google Play 결제로만
 *   팔아야 하므로, Play 결제를 쓸 수 없으면 Polar로 넘기지 않고 멈춥니다.
 *
 * 셸 표시만으로 "설치 앱"이라 판단하면 브라우저에서 `/app`을 연 웹 손님의
 * Polar 결제가 막힙니다. 반대로 설치 앱 판단을 `getDigitalGoodsService` 존재
 * 여부 하나에 맡기면, 앱 안인데 Play 결제가 준비되지 않은 기기에서 Polar로
 * 새어 나갑니다.
 *
 * 어느 쪽도 권한이 아닙니다. 값을 조작해도 바뀌는 것은 이 탭의 화면과 결제
 * 수단 안내뿐이고, 분석 권한은 서버가 결제 검증 뒤에만 줍니다.
 */

export const TWA_PACKAGE_ID = "com.mooaresume.twa";
/** TWA의 startUrl에 붙이는 표시. `C:\6.mooaresume-android\twa-manifest.json`과 맞춥니다. */
export const TWA_SOURCE_PARAM = "twa";

const INSTALLED_KEY = "mooa:app-installed:v1";

/**
 * 첫 화면이 TWA에서 열렸는가.
 *
 * TWA는 첫 탐색의 referrer를 `android-app://<패키지>`로 넘깁니다. 다만 새로
 * 고침이나 로그인 복귀 뒤에는 referrer가 바뀌므로, startUrl의 `?source=twa`도
 * 함께 봅니다. 둘 다 첫 진입에서만 믿고, 그 뒤로는 저장해 둔 값을 씁니다.
 */
export function isTwaLaunch(input: { search: string; referrer: string }): boolean {
  const source = new URLSearchParams(input.search).get("source");
  return source === TWA_SOURCE_PARAM || input.referrer.startsWith(`android-app://${TWA_PACKAGE_ID}`);
}

type SessionLike = Pick<Storage, "getItem" | "setItem">;

function readFlag(storage: SessionLike | null, key: string): boolean {
  try {
    return storage?.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(storage: SessionLike | null, key: string) {
  try {
    storage?.setItem(key, "1");
  } catch {
    // 저장이 막힌 브라우저에서는 이번 화면에서만 판단합니다.
  }
}

function sessionStorageOrNull(): SessionLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * 현재 탭의 앱 상태를 읽고, 첫 진입 신호가 있으면 기억합니다.
 * 화면 렌더링 중이 아니라 effect 안에서 부르세요(sessionStorage 접근).
 */
export function syncAppContext(input: {
  pathname: string;
  search: string;
  referrer: string;
  hasDigitalGoods: boolean;
  storage?: SessionLike | null;
}): { installed: boolean; shell: boolean } {
  const storage = input.storage === undefined ? sessionStorageOrNull() : input.storage;
  // Digital Goods API는 Play에서 설치한 TWA에만 있습니다.
  const installed = readFlag(storage, INSTALLED_KEY) || isTwaLaunch(input) || input.hasDigitalGoods;
  if (installed) writeFlag(storage, INSTALLED_KEY);
  // 기능 화면(`/app`)은 웹과 앱이 공유하지만, 하단 탭바는 설치된 TWA에만
  // 제공합니다. 이 구분으로 모바일 웹은 랜딩 헤더·홈 경로를 유지합니다.
  const shell = installed;
  return { installed, shell };
}

export function isAppShellPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

/** 결제 직전에 부릅니다. 저장값이 없으면 현재 주소·referrer로 한 번 더 확인합니다. */
export function isInstalledAppContext(): boolean {
  if (typeof window === "undefined") return false;
  return syncAppContext({
    pathname: window.location.pathname,
    search: window.location.search,
    referrer: document.referrer,
    hasDigitalGoods: "getDigitalGoodsService" in window,
  }).installed;
}

/** Creates a same-origin callback URL and preserves TWA context only for an installed app. */
export function createAuthCallbackUrl(nextPath: string): string {
  if (typeof window === "undefined") throw new Error("Auth callback URLs require a browser");
  const next = new URL(nextPath, window.location.origin);
  if (next.origin !== window.location.origin) throw new Error("Auth callback destination must stay on this site");
  if (isInstalledAppContext()) next.searchParams.set("source", TWA_SOURCE_PARAM);
  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", `${next.pathname}${next.search}`);
  return callback.toString();
}

/**
 * 앱과 모바일 웹을 CSS에서 구분하는 표시.
 *
 * 설치된 앱으로 열린 문서는 `<html data-app="twa">`를 갖습니다. 그러면 스타일을
 * 나눠 쓸 수 있습니다.
 *
 *   앱에만:      :global(html[data-app="twa"]) .card { ... }
 *   모바일 웹만: :global(html:not([data-app])) .card { ... }
 *
 * 규칙: 모바일 웹을 고칠 때는 `html:not([data-app])` 안에, 앱을 고칠 때는
 * `html[data-app="twa"]` 안에 씁니다. 표시 없는 규칙은 둘 다에 적용됩니다.
 * 표시는 권한이 아닙니다(화면 스타일만 바뀝니다).
 */
export const APP_MARKER_ATTRIBUTE = "data-app";
export const APP_MARKER_VALUE = "twa";

/**
 * 첫 페인트 전에 `<html>`에 앱 표시를 붙이는 인라인 스크립트(루트 레이아웃 `<head>`).
 * 판단 기준은 `syncAppContext`와 같습니다(시작 주소 표시, referrer, Digital Goods,
 * 이 탭에 저장된 설치 앱 표시). 저장소가 막혀 있어도 나머지 신호로 판단합니다.
 */
export const APP_MARKER_SCRIPT = `(function(){try{var w=window,d=document,s=false;try{s=w.sessionStorage.getItem(${JSON.stringify(INSTALLED_KEY)})==="1"}catch(e){}var q=new URLSearchParams(w.location.search).get("source")===${JSON.stringify(TWA_SOURCE_PARAM)};var r=d.referrer.indexOf(${JSON.stringify(`android-app://${TWA_PACKAGE_ID}`)})===0;var g="getDigitalGoodsService" in w;if(s||q||r||g)d.documentElement.setAttribute(${JSON.stringify(APP_MARKER_ATTRIBUTE)},${JSON.stringify(APP_MARKER_VALUE)})}catch(e){}})();`;

/** 클라이언트 이동 중에도 표시가 유지되도록 확인된 설치 앱에 표시를 붙입니다. */
export function markAppDocument(installed: boolean) {
  if (installed && typeof document !== "undefined") document.documentElement.setAttribute(APP_MARKER_ATTRIBUTE, APP_MARKER_VALUE);
}
