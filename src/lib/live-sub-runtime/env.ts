export const RUNTIME_APP_KEY = "mooaresume";
export const RUNTIME_PLATFORM = "web";
export const RUNTIME_APP_VERSION = "web";
export const RUNTIME_TIMEOUT_MS = 3_000;

export const runtimeEnvironment = process.env.NEXT_PUBLIC_LIVESUB_RUNTIME_ENV?.trim() || "production";

export const runtimeBaseUrls = (process.env.NEXT_PUBLIC_LIVESUB_RUNTIME_BASE_URLS || "https://runtime.live-sub.com")
  .split(",")
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);

export const runtimeCacheKey = `livesub.runtime.v1.${runtimeEnvironment}`;
