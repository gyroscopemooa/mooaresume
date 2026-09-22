import { describe, expect, it } from "vitest";
import { getRuntimeLink } from "./links";
import { parseRuntimeConfig } from "./schema";
import { selectRuntimeBanner, selectRuntimeEventCampaign, selectRuntimeNotices } from "./selectors";

const content = { title: "SNS 후기 이벤트", body: "후기를 공유해 보세요" };
function campaign(overrides: Record<string, unknown> = {}) { return { id: "campaign", status: "active", placements: ["home_banner"], placementConfigs: { home_banner: { layout: "banner" } }, platforms: ["web"], locales: ["ko"], audience: "all", targetRules: { ignoredByMvp: true }, frequency: { mode: "daily" }, linkType: "none", priority: 1, defaultLocale: "en", defaultContent: content, localizedContent: { ko: { ...content, title: "한국어 이벤트" } }, ...overrides }; }

describe("LIVE-SUB runtime config", () => {
  it("preserves HQ nested keys and merges partial locale overrides without losing the CTA", () => {
    const defaultContent = { title: "Title", body: "Body", buttonText: "Join", secondaryButtonText: "Later", badgeText: "Event", imageUrl: "https://example.com/event.png", linkUrl: "https://example.com/event" };
    const placement = { enabled: true, showCloseButton: true, delayMs: 3000, scrollTriggerPercent: 30, triggerEvent: "page_load", maxWidth: 440, layout: "card" };
    const config = parseRuntimeConfig({ schemaVersion: 1, eventCampaigns: [campaign({
      defaultContent, localizedContent: { ko: { body: "한국어 본문" } },
      placementConfigs: { home_banner: placement },
      frequency: { mode: "daily", hideDaysAfterClose: 7 },
    })] });
    const selected = selectRuntimeEventCampaign(config?.eventCampaigns ?? [], "home_banner");
    expect(selected?.content).toEqual({ ...defaultContent, body: "한국어 본문" });
    expect(selected?.config).toEqual(placement);
    expect(selected?.campaign.frequency).toEqual({ mode: "daily", hideDaysAfterClose: 7 });
    const disabled = parseRuntimeConfig({ schemaVersion: 1, eventCampaigns: [campaign({ placementConfigs: { home_banner: { enabled: false } } })] });
    expect(selectRuntimeEventCampaign(disabled?.eventCampaigns ?? [], "home_banner")).toBeNull();
  });
  it("keeps valid notices and campaigns while discarding malformed campaign entries", () => {
    const config = parseRuntimeConfig({ schemaVersion: 1, featureFlags: { launchPriceBanner: false, invalid: "no" }, eventCampaigns: [campaign(), { id: "bad", status: "active" }, campaign({ id: "old-trigger", placementConfigs: { home_banner: { triggerEvent: "immediate" } } })], notices: [{ id: "valid-notice", enabled: true, type: "banner", title: "안내", body: "내용", linkType: "none" }] });
    expect(config?.featureFlags).toEqual({ launchPriceBanner: false }); expect(config?.eventCampaigns.map((item) => item.id)).toEqual(["campaign"]); expect(config?.notices.map((notice) => notice.id)).toEqual(["valid-notice"]); expect("events" in (config ?? {})).toBe(false);
  });
  it("uses active status, web platform, schedule, priority and Korean localized content", () => {
    const config = parseRuntimeConfig({ schemaVersion: 1, eventCampaigns: [campaign({ id: "paused", status: "paused", priority: 9 }), campaign({ id: "app", platforms: ["ios"], priority: 8 }), campaign({ id: "expired", endAt: "2026-09-20T00:00:00.000Z", priority: 7 }), campaign({ id: "low", priority: 1 }), campaign({ id: "high", priority: 2 })] });
    const selected = selectRuntimeEventCampaign(config?.eventCampaigns ?? [], "home_banner", "ko", new Date("2026-09-21T00:00:00.000Z")); expect(selected?.campaign.id).toBe("high"); expect(selected?.content.title).toBe("한국어 이벤트"); expect(selected?.config.layout).toBe("banner");
  });
  it("falls back from an unavailable locale to defaultLocale content then defaultContent", () => {
    const defaultLocale = campaign({ locales: [], localizedContent: { en: { ...content, title: "English event" } } }); const fallback = campaign({ id: "fallback", defaultLocale: "ja", locales: [], localizedContent: {} });
    expect(selectRuntimeEventCampaign(parseRuntimeConfig({ schemaVersion: 1, eventCampaigns: [defaultLocale] })?.eventCampaigns ?? [], "home_banner", "ja")?.content.title).toBe("English event"); expect(selectRuntimeEventCampaign(parseRuntimeConfig({ schemaVersion: 1, eventCampaigns: [fallback] })?.eventCampaigns ?? [], "home_banner", "ko")?.content.title).toBe("SNS 후기 이벤트");
  });
  it("keeps legacy banners/notices and only permits safe links", () => {
    const config = parseRuntimeConfig({ schemaVersion: 1, banners: [{ id: "low", enabled: true, placement: "home_launch_price", priority: 1 }, { id: "high", enabled: true, placement: "home_launch_price", priority: 2 }], notices: [{ id: "low", enabled: true, type: "banner", title: "낮음", body: "낮음", priority: 1 }, { id: "high", enabled: true, type: "banner", title: "높음", body: "높음", priority: 2 }] });
    expect(selectRuntimeBanner(config?.banners ?? [], "home_launch_price")?.id).toBe("high"); expect(selectRuntimeNotices(config?.notices ?? []).map((notice) => notice.id)).toEqual(["high", "low"]); expect(getRuntimeLink("https://mooaresume.com/guide", "external")?.external).toBe(true); expect(getRuntimeLink("javascript:alert(1)", "external")).toBeNull();
  });
});
