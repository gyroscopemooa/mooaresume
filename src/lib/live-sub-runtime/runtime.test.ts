import { describe, expect, it } from "vitest";
import { getRuntimeLink } from "./links";
import { parseRuntimeConfig } from "./schema";
import { selectRuntimeBanner, selectRuntimeNotices } from "./selectors";

describe("LIVE-SUB runtime config", () => {
  it("keeps valid entries while discarding invalid optional entries", () => {
    const config = parseRuntimeConfig({
      schemaVersion: 1,
      appKey: "mooaresume",
      environment: "staging",
      unknownFutureField: { ignored: true },
      featureFlags: { launchPriceBanner: false, invalid: "no" },
      banners: [
        { id: "valid", enabled: true, placement: "home_launch_price", linkType: "none" },
        { id: "missing-placement", enabled: true },
      ],
      notices: [
        { id: "valid-notice", enabled: true, type: "banner", title: "안내", body: "내용", linkType: "none" },
        { id: "bad-notice", enabled: true, type: "not-a-type", title: "안내", body: "내용" },
      ],
    });

    expect(config?.featureFlags).toEqual({ launchPriceBanner: false });
    expect(config?.banners.map((banner) => banner.id)).toEqual(["valid"]);
    expect(config?.notices.map((notice) => notice.id)).toEqual(["valid-notice"]);
  });

  it("selects only active Korean all-audience banners by highest priority", () => {
    const config = parseRuntimeConfig({
      schemaVersion: 1,
      banners: [
        { id: "expired", enabled: true, placement: "home_launch_price", endAt: "2026-09-20T00:00:00.000Z" },
        { id: "english", enabled: true, placement: "home_launch_price", locales: ["en"], priority: 9 },
        { id: "premium", enabled: true, placement: "home_launch_price", audience: "premium", priority: 10 },
        { id: "low", enabled: true, placement: "home_launch_price", priority: 1 },
        { id: "high", enabled: true, placement: "home_launch_price", locales: ["ko-KR"], priority: 2 },
      ],
    });

    expect(selectRuntimeBanner(config?.banners ?? [], "home_launch_price", "ko", new Date("2026-09-21T00:00:00.000Z"))?.id).toBe("high");
  });

  it("returns active banner notices in priority order", () => {
    const config = parseRuntimeConfig({
      schemaVersion: 1,
      notices: [
        { id: "inline", enabled: true, type: "inline", title: "제외", body: "제외" },
        { id: "low", enabled: true, type: "banner", title: "낮음", body: "낮음", priority: 1 },
        { id: "high", enabled: true, type: "banner", title: "높음", body: "높음", priority: 2 },
      ],
    });

    expect(selectRuntimeNotices(config?.notices ?? []).map((notice) => notice.id)).toEqual(["high", "low"]);
  });

  it("allows only internal routes and HTTPS external links", () => {
    expect(getRuntimeLink("/#plans", "none")).toEqual({ href: "/#plans", external: false });
    expect(getRuntimeLink("https://mooaresume.com/guide", "external")?.external).toBe(true);
    expect(getRuntimeLink("http://example.com", "external")).toBeNull();
    expect(getRuntimeLink("javascript:alert(1)", "external")).toBeNull();
  });
});
