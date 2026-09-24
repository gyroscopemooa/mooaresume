import { describe, expect, it, vi } from "vitest";
import { isValidMaintenanceBypassToken } from "./maintenance-bypass";
import {
  DEFAULT_FEATURE_MAINTENANCE_MESSAGE,
  DEFAULT_MAINTENANCE_IMAGE_BACKGROUND,
  DEFAULT_MAINTENANCE_MESSAGE,
  MAINTENANCE_BYPASS_STORAGE_KEY,
  MAINTENANCE_BYPASS_TTL_MS,
  readMaintenanceBypass,
  resolveMaintenance,
  writeMaintenanceBypass,
} from "./maintenance";
import { parseRuntimeConfig } from "./schema";

const NOW = new Date("2026-09-25T12:00:00.000Z");
const on = (overrides: Partial<{ scope: string; message: string; startsAt: string; endsAt: string }> = {}) => ({
  enabled: true, message: "점검 안내", scope: "all", ...overrides,
});

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
  };
}

describe("점검 모드 해석", () => {
  it('scope "all" → 전체 차단, 어느 경로로 들어와도(메일 딥링크 포함) 동일', () => {
    for (const pathname of ["/", "/result/complete", "/quick", "/community", "/api-less/anything"]) {
      expect(resolveMaintenance(on(), { pathname, now: NOW })).toEqual({ mode: "full", message: "점검 안내" });
    }
  });

  it("message 가 비어 있으면 기본 문구", () => {
    expect(resolveMaintenance(on({ message: "  " }), { pathname: "/", now: NOW })).toEqual({ mode: "full", message: DEFAULT_MAINTENANCE_MESSAGE });
    expect(resolveMaintenance(on({ scope: "resume_analysis", message: "" }), { pathname: "/quick", now: NOW })).toEqual({
      mode: "feature", feature: "resume_analysis", message: DEFAULT_FEATURE_MAINTENANCE_MESSAGE,
    });
  });

  it("기능 key → 그 기능 진입 화면만 막고 홈·커뮤니티·결제·결과는 그대로", () => {
    const maintenance = on({ scope: "resume_analysis" });
    for (const pathname of ["/quick", "/quick/anything", "/pro", "/final", "/analysis/run-1", "/new"]) {
      expect(resolveMaintenance(maintenance, { pathname, now: NOW })?.mode).toBe("feature");
    }
    for (const pathname of ["/", "/community", "/community/post-1", "/result/complete", "/refer", "/quickly"]) {
      expect(resolveMaintenance(maintenance, { pathname, now: NOW })).toBeNull();
    }
  });

  it("경로는 세그먼트 단위로 비교한다 (/career 가 /career-description 을 막지 않음)", () => {
    expect(resolveMaintenance(on({ scope: "career_assessment" }), { pathname: "/career-description", now: NOW })).toBeNull();
    expect(resolveMaintenance(on({ scope: "career_assessment" }), { pathname: "/career/values", now: NOW })?.mode).toBe("feature");
  });

  it("등록표에 없는 key 는 첫 경로 세그먼트와 같을 때만 막는다", () => {
    expect(resolveMaintenance(on({ scope: "refer" }), { pathname: "/refer", now: NOW })?.mode).toBe("feature");
    expect(resolveMaintenance(on({ scope: "refer" }), { pathname: "/", now: NOW })).toBeNull();
    expect(resolveMaintenance(on({ scope: "" }), { pathname: "/", now: NOW })).toBeNull();
  });

  it("꺼져 있거나 기간 밖이면 비활성", () => {
    expect(resolveMaintenance({ ...on(), enabled: false }, { pathname: "/", now: NOW })).toBeNull();
    expect(resolveMaintenance(on({ startsAt: "2026-09-25T13:00:00.000Z" }), { pathname: "/", now: NOW })).toBeNull();
    expect(resolveMaintenance(on({ endsAt: "2026-09-25T11:00:00.000Z" }), { pathname: "/", now: NOW })).toBeNull();
    expect(resolveMaintenance(on({ startsAt: "2026-09-25T11:00:00.000Z", endsAt: "2026-09-25T13:00:00.000Z" }), { pathname: "/", now: NOW })?.mode).toBe("full");
  });

  it("우회 중이면 전체 차단이어도 막지 않는다", () => {
    expect(resolveMaintenance(on(), { pathname: "/", now: NOW, bypassed: true })).toBeNull();
  });

  it("HQ 응답이 기본값(점검 없음)이거나 잘못된 점검 항목이면 막지 않는다", () => {
    const parsed = parseRuntimeConfig({ schemaVersion: 1, maintenance: { enabled: "yes" } });
    expect(resolveMaintenance(parsed!.maintenance, { pathname: "/", now: NOW })).toBeNull();
    const none = parseRuntimeConfig({ schemaVersion: 1 });
    expect(resolveMaintenance(none!.maintenance, { pathname: "/", now: NOW })).toBeNull();
  });
});

describe("HQ 가 null / 이미지 필드를 보낼 때", () => {
  const parse = (maintenance: Record<string, unknown>) => parseRuntimeConfig({ schemaVersion: 1, maintenance })!.maintenance;
  const base = { enabled: true, message: "점검 안내", scope: "all" };

  it("startsAt/endsAt/imageUrl 이 null 이어도 점검이 그대로 켜진다", () => {
    const maintenance = parse({ ...base, startsAt: null, endsAt: null, imageUrl: null, mobileImageUrl: null, imageBackground: null });
    expect(maintenance.enabled).toBe(true);
    expect(resolveMaintenance(maintenance, { pathname: "/quick", now: NOW })).toEqual({ mode: "full", message: "점검 안내" });
  });

  it("message 가 null 이어도 점검이 켜지고 기본 문구를 쓴다", () => {
    expect(resolveMaintenance(parse({ ...base, message: null }), { pathname: "/", now: NOW })).toEqual({ mode: "full", message: DEFAULT_MAINTENANCE_MESSAGE });
  });

  it("null 인 endsAt 은 기간 제한 없음, 지난 endsAt 은 여전히 비활성", () => {
    expect(resolveMaintenance(parse({ ...base, endsAt: null }), { pathname: "/", now: NOW })?.mode).toBe("full");
    expect(resolveMaintenance(parse({ ...base, endsAt: "2026-09-25T11:00:00.000Z" }), { pathname: "/", now: NOW })).toBeNull();
  });

  it("이미지: imageUrl 만 있으면 데스크톱·모바일 모두 그 이미지, 배경 기본 검정", () => {
    const state = resolveMaintenance(parse({ ...base, imageUrl: "https://runtime.live-sub.com/a.png" }), { pathname: "/", now: NOW });
    expect(state).toEqual({ mode: "full", message: "점검 안내", image: { desktop: "https://runtime.live-sub.com/a.png", mobile: "https://runtime.live-sub.com/a.png", background: DEFAULT_MAINTENANCE_IMAGE_BACKGROUND } });
  });

  it("이미지: mobileImageUrl 만 있으면 데스크톱도 그 이미지, 둘 다 있으면 각각", () => {
    const only = resolveMaintenance(parse({ ...base, mobileImageUrl: "https://x.test/m.png" }), { pathname: "/", now: NOW });
    expect(only).toMatchObject({ image: { desktop: "https://x.test/m.png", mobile: "https://x.test/m.png" } });
    const both = resolveMaintenance(parse({ ...base, imageUrl: "https://x.test/d.png", mobileImageUrl: "https://x.test/m.png", imageBackground: "#ffcc00" }), { pathname: "/", now: NOW });
    expect(both).toMatchObject({ image: { desktop: "https://x.test/d.png", mobile: "https://x.test/m.png", background: "#ffcc00" } });
  });

  it("잘못된 이미지 값(비 https, 깨진 URL, 잘못된 색)은 없음으로 취급하고 점검은 유지", () => {
    const maintenance = parse({ ...base, imageUrl: "http://evil.test/a.png", mobileImageUrl: "not a url", imageBackground: "red" });
    expect(maintenance.enabled).toBe(true);
    expect(maintenance.imageUrl).toBeUndefined();
    expect(maintenance.mobileImageUrl).toBeUndefined();
    expect(maintenance.imageBackground).toBeUndefined();
    expect(resolveMaintenance(maintenance, { pathname: "/", now: NOW })).toEqual({ mode: "full", message: "점검 안내" });
    expect(parse({ ...base, imageUrl: 123 }).enabled).toBe(true);
  });

  it("http://localhost 는 개발 빌드에서만 허용, production 에서는 거부", () => {
    expect(parse({ ...base, imageUrl: "http://localhost:3000/a.png" }).imageUrl).toBe("http://localhost:3000/a.png");
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(parse({ ...base, imageUrl: "http://localhost:3000/a.png" }).imageUrl).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("기능(feature) 점검은 이미지를 무시한다", () => {
    const state = resolveMaintenance(parse({ ...base, scope: "community", imageUrl: "https://x.test/d.png" }), { pathname: "/community", now: NOW });
    expect(state).toEqual({ mode: "feature", feature: "community", message: "점검 안내" });
  });
});

describe("우회 기억(12시간)", () => {
  it("기록 후 12시간 안에는 우회, 지나면 우회 아님(기록도 지움)", () => {
    const storage = memoryStorage();
    expect(readMaintenanceBypass(storage, 1_000)).toBe(false);
    writeMaintenanceBypass(storage, true, 1_000);
    expect(readMaintenanceBypass(storage, 1_000 + MAINTENANCE_BYPASS_TTL_MS - 1)).toBe(true);
    expect(readMaintenanceBypass(storage, 1_000 + MAINTENANCE_BYPASS_TTL_MS + 1)).toBe(false);
    expect(storage.getItem(MAINTENANCE_BYPASS_STORAGE_KEY)).toBeNull();
  });

  it("bypass=off 는 기록을 지우고, 저장소가 깨져도 예외를 내지 않는다", () => {
    const storage = memoryStorage();
    writeMaintenanceBypass(storage, true);
    writeMaintenanceBypass(storage, false);
    expect(readMaintenanceBypass(storage)).toBe(false);
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
    expect(readMaintenanceBypass(broken)).toBe(false);
    expect(() => writeMaintenanceBypass(broken, true)).not.toThrow();
  });
});

describe("우회 토큰 확인(서버)", () => {
  const expected = "correct-horse-battery-staple";
  it("일치할 때만 통과", () => {
    expect(isValidMaintenanceBypassToken(expected, expected)).toBe(true);
    expect(isValidMaintenanceBypassToken("wrong-token-wrong-token", expected)).toBe(false);
    expect(isValidMaintenanceBypassToken("", expected)).toBe(false);
    expect(isValidMaintenanceBypassToken(undefined, expected)).toBe(false);
    expect(isValidMaintenanceBypassToken({ toString: () => expected }, expected)).toBe(false);
  });

  it("토큰이 설정되지 않았거나 너무 짧으면 어떤 값도 통과시키지 않는다", () => {
    expect(isValidMaintenanceBypassToken("", "")).toBe(false);
    expect(isValidMaintenanceBypassToken("abc", undefined)).toBe(false);
    expect(isValidMaintenanceBypassToken("short", "short")).toBe(false);
  });
});
