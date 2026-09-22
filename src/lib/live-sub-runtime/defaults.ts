import type { RuntimeConfig } from "./schema";

export const runtimeDefaults: RuntimeConfig = {
  schemaVersion: 1,
  appKey: "mooaresume",
  environment: "production",
  version: null,
  featureFlags: {
    launchPriceBanner: true,
    siteNotice: true,
  },
  banners: [],
  eventCampaigns: [],
  notices: [],
  maintenance: { enabled: false, message: "", scope: "all" },
};
