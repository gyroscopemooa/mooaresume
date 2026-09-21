import { RUNTIME_APP_KEY, RUNTIME_APP_VERSION, RUNTIME_PLATFORM, RUNTIME_TIMEOUT_MS, runtimeBaseUrls, runtimeEnvironment } from "./env";
import { runtimeDefaults } from "./defaults";
import { parseRuntimeConfig, type RuntimeConfig } from "./schema";

export type RuntimeFetchResult = { config: RuntimeConfig | null; reason: "applied" | "not_published" | "fetch_failed" | "schema_invalid" };

export async function fetchRuntimeConfig(): Promise<RuntimeFetchResult> {
  let schemaInvalid = false;
  for (const baseUrl of runtimeBaseUrls) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), RUNTIME_TIMEOUT_MS);
    try {
      const url = new URL(`/api/runtime/v1/apps/${RUNTIME_APP_KEY}/config`, baseUrl);
      url.searchParams.set("env", runtimeEnvironment);
      url.searchParams.set("platform", RUNTIME_PLATFORM);
      url.searchParams.set("appVersion", RUNTIME_APP_VERSION);
      const response = await fetch(url, { signal: controller.signal, credentials: "omit" });
      // A deliberate unpublished response must remove old campaign copy.
      if (response.status === 404) return { config: runtimeDefaults, reason: "not_published" };
      if (!response.ok) continue;
      const config = parseRuntimeConfig(await response.json());
      if (!config || config.environment !== runtimeEnvironment) {
        schemaInvalid = true;
        continue;
      }
      return { config, reason: "applied" };
    } catch {
      // Try a configured fallback URL before retaining the cached/default copy.
    } finally {
      window.clearTimeout(timeout);
    }
  }
  return { config: null, reason: schemaInvalid ? "schema_invalid" : "fetch_failed" };
}
