import type { RuntimeBanner, RuntimeEventCampaign, RuntimeEventContent, RuntimeEventPlacement, RuntimeEventPlacementConfig, RuntimeNotice } from "./schema";

type Schedulable = { enabled: boolean; locales?: string[]; audience: "all" | "free" | "premium"; startAt?: string; endAt?: string; priority: number };
export type SelectedEventCampaign = { campaign: RuntimeEventCampaign; placement: RuntimeEventPlacement; config: RuntimeEventPlacementConfig; content: RuntimeEventContent };
function localeMatches(configured: string, locale: string) { return configured === locale || configured.split("-")[0] === locale.split("-")[0]; }

export function isRuntimeItemActive(item: Schedulable, locale = "ko", now = new Date()): boolean {
  if (!item.enabled || item.audience !== "all") return false;
  if (item.locales?.length && !item.locales.some((configured) => localeMatches(configured, locale))) return false;
  if (item.startAt && new Date(item.startAt) > now) return false;
  return !item.endAt || new Date(item.endAt) >= now;
}
export function selectRuntimeBanner(banners: RuntimeBanner[], placement: string, locale = "ko", now = new Date()): RuntimeBanner | null { return banners.filter((banner) => banner.placement === placement && isRuntimeItemActive(banner, locale, now)).sort((left, right) => right.priority - left.priority)[0] ?? null; }
function resolveCampaignContent(campaign: RuntimeEventCampaign, locale: string): RuntimeEventContent {
  const override = campaign.localizedContent[locale] ?? Object.entries(campaign.localizedContent).find(([configured]) => localeMatches(configured, locale))?.[1];
  return { ...campaign.defaultContent, ...campaign.localizedContent[campaign.defaultLocale], ...override };
}
function isActiveCampaign(campaign: RuntimeEventCampaign, placement: RuntimeEventPlacement, locale: string, now: Date): boolean {
  if (campaign.status !== "active" || !campaign.placements.includes(placement)) return false;
  if (campaign.placementConfigs[placement]?.enabled === false) return false;
  if (campaign.platforms.length > 0 && !campaign.platforms.includes("web")) return false;
  // Purchase state is deliberately not inferred from this public runtime.
  if (campaign.locales.length > 0 && !campaign.locales.some((configured) => localeMatches(configured, locale))) return false;
  if (campaign.startAt && new Date(campaign.startAt) > now) return false;
  return !campaign.endAt || new Date(campaign.endAt) >= now;
}
export function selectRuntimeEventCampaign(campaigns: RuntimeEventCampaign[], placement: RuntimeEventPlacement, locale = "ko", now = new Date()): SelectedEventCampaign | null {
  const campaign = campaigns.filter((item) => isActiveCampaign(item, placement, locale, now)).sort((left, right) => right.priority - left.priority)[0];
  return campaign ? { campaign, placement, config: campaign.placementConfigs[placement] ?? {}, content: resolveCampaignContent(campaign, locale) } : null;
}
export function selectRuntimeNotices(notices: RuntimeNotice[], locale = "ko", now = new Date()): RuntimeNotice[] { return notices.filter((notice) => notice.type === "banner" && isRuntimeItemActive(notice, locale, now)).sort((left, right) => right.priority - left.priority); }
