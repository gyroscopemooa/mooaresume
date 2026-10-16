import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

describe("pinned local vision runtime privacy regression", () => {
  it("keeps the audited runtime until an explicit upgrade and network review", () => {
    const require = createRequire(import.meta.url);
    const packageRoot = dirname(require.resolve("@mediapipe/tasks-vision"));
    const metadata: { version: string } = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    // 1.0.1 enabled third-party performance logging by default. Re-audit before upgrading.
    expect(metadata.version).toBe("0.10.32");
    for (const file of ["vision_bundle.mjs", "vision_bundle.cjs", "wasm/vision_wasm_internal.js", "wasm/vision_wasm_nosimd_internal.js"]) {
      const source = readFileSync(join(packageRoot, file), "utf8");
      for (const telemetryMarker of ["odml.pa.googleapis.com", "enableLogging", "sendBeacon", "/v1/log"]) {
        expect(source, `${file}: review dependency privacy before changing this guard`).not.toContain(telemetryMarker);
      }
    }
  });
});
