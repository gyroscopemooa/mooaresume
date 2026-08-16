import { describe, expect, it } from "vitest";
import {
  auditEnvironment,
  formatReadiness,
  parseEnvText,
} from "../../../scripts/check-e2e-readiness.mjs";

describe("external E2E readiness", () => {
  it("parses dotenv values without requiring a runtime dependency", () => {
    expect(parseEnvText("# comment\nA=one\nB=\"two\"\nEMPTY=")).toEqual({
      A: "one",
      B: "two",
      EMPTY: "",
    });
  });

  it("reports only missing variable names and never secret values", () => {
    const audit = auditEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-value",
      SUPABASE_SECRET_KEY: "server-secret-value",
      POLAR_SERVER: "sandbox",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    });
    const output = formatReadiness(audit, {
      authCallback: true,
      migrations: true,
      supabaseCli: false,
    });

    expect(audit.ready).toBe(false);
    expect(output).toContain("POLAR_ACCESS_TOKEN");
    expect(output).toContain("OPENAI_API_KEY");
    expect(output).not.toContain("publishable-value");
    expect(output).not.toContain("server-secret-value");
  });

  it("accepts a complete sandbox configuration", () => {
    const values = Object.fromEntries(
      [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "SUPABASE_SECRET_KEY",
        "POLAR_ACCESS_TOKEN",
        "POLAR_WEBHOOK_SECRET",
        "POLAR_QUICK_PRODUCT_ID",
        "OPENAI_API_KEY",
        "OPENAI_MODEL",
      ].map((key) => [key, "configured"]),
    );
    values.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    values.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    values.POLAR_SERVER = "sandbox";

    expect(auditEnvironment(values).ready).toBe(true);
  });
});
