import type { RuntimeMaintenance } from "./schema";

export const DEFAULT_MAINTENANCE_MESSAGE = "무아레쥬메 점검 중입니다. 잠시 후 다시 시도해주세요.";
export const DEFAULT_FEATURE_MAINTENANCE_MESSAGE = "이 기능은 지금 점검 중입니다. 잠시 후 다시 시도해주세요.";

/**
 * HQ 의 scope 값(기능 key) → 그 기능의 진입 화면 경로. 경로는 세그먼트 단위로 비교하므로
 * "/career" 는 "/career-description" 을 막지 않는다. 결제(/#plans, 결제 API)와 결과 보기는
 * 어떤 기능 key 로도 막히지 않는다.
 */
export const maintenanceFeatureRoutes: Record<string, string[]> = {
  resume_analysis: ["/analysis", "/analyze", "/begin", "/entry", "/start", "/new", "/quick", "/pro", "/final"],
  resume_build: ["/resume"],
  career_assessment: ["/career"],
  career_description: ["/career-description"],
  portfolio: ["/portfolio"],
  legal: ["/legal"],
  community: ["/community"],
};

/** 전체 차단 화면에 쓰는 이미지. desktop/mobile 은 한쪽만 설정돼도 둘 다 채워진다. */
export type MaintenanceImage = { desktop: string; mobile: string; background: string };

export const DEFAULT_MAINTENANCE_IMAGE_BACKGROUND = "#000000";

export type MaintenanceState =
  | { mode: "full"; message: string; image?: MaintenanceImage }
  | { mode: "feature"; message: string; feature: string }
  | null;

// startsAt/endsAt 는 HQ 가 null 로 보내도 "없음"이다.
function isWithinWindow(maintenance: RuntimeMaintenance, now: Date): boolean {
  if (maintenance.startsAt && new Date(maintenance.startsAt) > now) return false;
  return !maintenance.endsAt || new Date(maintenance.endsAt) >= now;
}

function resolveMaintenanceImage(maintenance: RuntimeMaintenance): MaintenanceImage | undefined {
  const desktop = maintenance.imageUrl ?? maintenance.mobileImageUrl;
  const mobile = maintenance.mobileImageUrl ?? maintenance.imageUrl;
  if (!desktop || !mobile) return undefined;
  return { desktop, mobile, background: maintenance.imageBackground ?? DEFAULT_MAINTENANCE_IMAGE_BACKGROUND };
}

function pathMatches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** 등록표에 없는 key 는 첫 경로 세그먼트와 같을 때만 그 화면으로 본다(community, my_page → /my-page). */
export function pathMatchesMaintenanceFeature(scope: string, pathname: string): boolean {
  const routes = maintenanceFeatureRoutes[scope];
  if (routes) return routes.some((prefix) => pathMatches(pathname, prefix));
  const firstSegment = pathname.split("/")[1];
  return Boolean(firstSegment) && firstSegment === scope.replace(/_/g, "-");
}

/**
 * 점검 상태를 해석한다. scope "all" 이면 전체 차단(이미지가 있으면 함께), 그 밖의 값이면 그 기능 화면만 막는다(이미지는 무시).
 * 우회(bypass)한 사람과 기간 밖 점검은 항상 null. 잘못된 입력은 전부 "막지 않음" 쪽으로 기운다.
 */
export function resolveMaintenance(
  maintenance: RuntimeMaintenance,
  context: { pathname: string; now?: Date; bypassed?: boolean },
): MaintenanceState {
  if (!maintenance.enabled || context.bypassed) return null;
  if (!isWithinWindow(maintenance, context.now ?? new Date())) return null;

  const scope = maintenance.scope.trim();
  if (scope === "all") {
    const image = resolveMaintenanceImage(maintenance);
    return { mode: "full", message: maintenance.message.trim() || DEFAULT_MAINTENANCE_MESSAGE, ...(image ? { image } : {}) };
  }
  if (!scope || !pathMatchesMaintenanceFeature(scope, context.pathname)) return null;
  return { mode: "feature", feature: scope, message: maintenance.message.trim() || DEFAULT_FEATURE_MAINTENANCE_MESSAGE };
}

/** 우회 토큰을 확인한 브라우저를 12시간 동안 기억한다. 서버 차단이 아니라 화면 편의이므로 저장소 실패는 조용히 무시. */
export const MAINTENANCE_BYPASS_STORAGE_KEY = "livesub.maintenance.bypass.v1";
export const MAINTENANCE_BYPASS_TTL_MS = 12 * 60 * 60 * 1000;

export function readMaintenanceBypass(storage: Pick<Storage, "getItem" | "removeItem">, now = Date.now()): boolean {
  try {
    const expiresAt = Number(storage.getItem(MAINTENANCE_BYPASS_STORAGE_KEY));
    if (Number.isFinite(expiresAt) && expiresAt > now) return true;
    storage.removeItem(MAINTENANCE_BYPASS_STORAGE_KEY);
  } catch {
    // 저장소를 못 읽으면 우회 없음으로 본다.
  }
  return false;
}

export function writeMaintenanceBypass(storage: Pick<Storage, "setItem" | "removeItem">, enabled: boolean, now = Date.now()) {
  try {
    if (enabled) storage.setItem(MAINTENANCE_BYPASS_STORAGE_KEY, String(now + MAINTENANCE_BYPASS_TTL_MS));
    else storage.removeItem(MAINTENANCE_BYPASS_STORAGE_KEY);
  } catch {
    // 시크릿 모드 등: 이번 방문에서만 우회가 유지된다.
  }
}
