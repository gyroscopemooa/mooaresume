"use client";

import { useSyncExternalStore } from "react";
import { fetchRuntimeConfig } from "./client";
import { runtimeCacheKey } from "./env";
import { runtimeDefaults } from "./defaults";
import { parseRuntimeConfig, type RuntimeConfig } from "./schema";

type RuntimeState = { config: RuntimeConfig; initialized: boolean };
type CacheEntry = { config: RuntimeConfig };

let state: RuntimeState = { config: runtimeDefaults, initialized: false };
let refreshPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: Partial<RuntimeState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function loadCachedConfig(): RuntimeConfig | null {
  try {
    const entry = JSON.parse(window.localStorage.getItem(runtimeCacheKey) ?? "null") as CacheEntry | null;
    return entry ? parseRuntimeConfig(entry.config) : null;
  } catch {
    return null;
  }
}

function saveCachedConfig(config: RuntimeConfig) {
  try {
    window.localStorage.setItem(runtimeCacheKey, JSON.stringify({ config } satisfies CacheEntry));
  } catch {
    // Private mode or a full quota must preserve the in-memory/default fallback.
  }
}

function clearCachedConfig() {
  try { window.localStorage.removeItem(runtimeCacheKey); } catch {}
}

export function refreshRuntimeConfig(): Promise<void> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    if (!state.initialized) {
      const cached = loadCachedConfig();
      publish({ config: cached ?? runtimeDefaults, initialized: true });
    }
    const result = await fetchRuntimeConfig();
    if (result.reason === "not_published") {
      clearCachedConfig();
      publish({ config: runtimeDefaults });
    } else if (result.config) {
      saveCachedConfig(result.config);
      publish({ config: result.config });
    }
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void refreshRuntimeConfig();
  return () => listeners.delete(listener);
}

export function useRuntimeConfig() {
  return useSyncExternalStore(subscribe, () => state.config, () => runtimeDefaults);
}
