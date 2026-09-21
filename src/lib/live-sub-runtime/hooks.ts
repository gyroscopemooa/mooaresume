"use client";

import { useMemo } from "react";
import { selectRuntimeBanner, selectRuntimeNotices } from "./selectors";
import { useRuntimeConfig } from "./store";

export function useRuntimeFlag(key: string, fallback: boolean): boolean {
  const config = useRuntimeConfig();
  return config.featureFlags[key] ?? fallback;
}

export function useRuntimeBanner(placement: string) {
  const config = useRuntimeConfig();
  return useMemo(() => selectRuntimeBanner(config.banners, placement), [config.banners, placement]);
}

export function useRuntimeNotices() {
  const config = useRuntimeConfig();
  return useMemo(() => selectRuntimeNotices(config.notices), [config.notices]);
}

export function useRuntimeMaintenance() {
  return useRuntimeConfig().maintenance;
}
