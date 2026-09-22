"use client";

import { useMemo } from "react";
import { selectRuntimeBanner, selectRuntimeEventCampaign, selectRuntimeNotices } from "./selectors";
import type { RuntimeEventPlacement } from "./schema";
import { useRuntimeConfig } from "./store";

export function useRuntimeFlag(key: string, fallback: boolean): boolean {
  const config = useRuntimeConfig();
  return config.featureFlags[key] ?? fallback;
}

export function useRuntimeBanner(placement: string) {
  const config = useRuntimeConfig();
  return useMemo(() => selectRuntimeBanner(config.banners, placement), [config.banners, placement]);
}

export function useRuntimeEventCampaign(slot: RuntimeEventPlacement) {
  const config = useRuntimeConfig();
  return useMemo(() => selectRuntimeEventCampaign(config.eventCampaigns, slot), [config.eventCampaigns, slot]);
}

export function useRuntimeNotices() {
  const config = useRuntimeConfig();
  return useMemo(() => selectRuntimeNotices(config.notices), [config.notices]);
}

export function useRuntimeMaintenance() {
  return useRuntimeConfig().maintenance;
}
