import type { RuntimeBanner, RuntimeNotice } from "./schema";

type Schedulable = { enabled: boolean; locales?: string[]; audience: "all" | "free" | "premium"; startAt?: string; endAt?: string; priority: number };

export function isRuntimeItemActive(item: Schedulable, locale = "ko", now = new Date()): boolean {
  if (!item.enabled || item.audience !== "all") return false;
  if (item.locales?.length && !item.locales.some((configured) => configured === locale || configured.split("-")[0] === locale.split("-")[0])) return false;
  if (item.startAt && new Date(item.startAt) > now) return false;
  return !item.endAt || new Date(item.endAt) >= now;
}

export function selectRuntimeBanner(banners: RuntimeBanner[], placement: string, locale = "ko", now = new Date()): RuntimeBanner | null {
  return banners
    .filter((banner) => banner.placement === placement && isRuntimeItemActive(banner, locale, now))
    .sort((left, right) => right.priority - left.priority)[0] ?? null;
}

export function selectRuntimeNotices(notices: RuntimeNotice[], locale = "ko", now = new Date()): RuntimeNotice[] {
  return notices
    .filter((notice) => notice.type === "banner" && isRuntimeItemActive(notice, locale, now))
    .sort((left, right) => right.priority - left.priority);
}
