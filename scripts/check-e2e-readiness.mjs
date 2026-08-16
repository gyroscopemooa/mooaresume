import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

export const REQUIRED_ENV_GROUPS = {
  supabase: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
  ],
  polar: [
    "POLAR_ACCESS_TOKEN",
    "POLAR_WEBHOOK_SECRET",
    "POLAR_QUICK_PRODUCT_ID",
  ],
  openai: ["OPENAI_API_KEY", "OPENAI_MODEL"],
  app: ["NEXT_PUBLIC_SITE_URL"],
};

export function parseEnvText(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      value.length >= 2
      && ((value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export function auditEnvironment(values) {
  const groups = Object.fromEntries(
    Object.entries(REQUIRED_ENV_GROUPS).map(([group, keys]) => [
      group,
      {
        ready: keys.every((key) => Boolean(values[key]?.trim())),
        missing: keys.filter((key) => !values[key]?.trim()),
      },
    ]),
  );
  const polarServer = values.POLAR_SERVER || "sandbox";
  const validPolarServer = polarServer === "sandbox" || polarServer === "production";
  let validSiteUrl = false;
  try {
    validSiteUrl = Boolean(new URL(values.NEXT_PUBLIC_SITE_URL));
  } catch {
    validSiteUrl = false;
  }
  return {
    groups,
    validPolarServer,
    validSiteUrl,
    ready: Object.values(groups).every((group) => group.ready)
      && validPolarServer
      && validSiteUrl,
  };
}

function readLocalEnvironment() {
  const merged = {};
  for (const filename of [".env", ".env.local"]) {
    if (existsSync(filename)) {
      Object.assign(merged, parseEnvText(readFileSync(filename, "utf8")));
    }
  }
  return { ...merged, ...process.env };
}

function supabaseCliAvailable() {
  const result = spawnSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "--version"], {
    encoding: "utf8",
    stdio: "ignore",
  });
  return result.status === 0;
}

export function formatReadiness(audit, checks) {
  const lines = ["MOOA external E2E readiness"];
  for (const [name, group] of Object.entries(audit.groups)) {
    lines.push(
      `[${group.ready ? "READY" : "MISSING"}] ${name}${group.ready ? "" : `: ${group.missing.join(", ")}`}`,
    );
  }
  lines.push(`[${audit.validSiteUrl ? "READY" : "INVALID"}] NEXT_PUBLIC_SITE_URL`);
  lines.push(`[${audit.validPolarServer ? "READY" : "INVALID"}] POLAR_SERVER (sandbox|production)`);
  lines.push(`[${checks.authCallback ? "READY" : "MISSING"}] /auth/callback route`);
  lines.push(`[${checks.migrations ? "READY" : "MISSING"}] Supabase migrations`);
  lines.push(`[${checks.supabaseCli ? "READY" : "MISSING"}] Supabase CLI`);
  lines.push(`[${checks.authConfig ? "READY" : "MISSING"}] Supabase Auth callback config`);
  lines.push("");
  lines.push("Secret values are never printed.");
  return lines.join("\n");
}

function main() {
  const audit = auditEnvironment(readLocalEnvironment());
  const checks = {
    authCallback: existsSync("src/app/auth/callback/route.ts"),
    migrations: existsSync("supabase/migrations")
      && readFileCount("supabase/migrations", ".sql") > 0,
    authConfig: existsSync("supabase/config.toml")
      && readFileSync("supabase/config.toml", "utf8").includes("/auth/callback"),
    supabaseCli: supabaseCliAvailable(),
  };
  console.log(formatReadiness(audit, checks));
  process.exitCode = audit.ready && Object.values(checks).every(Boolean) ? 0 : 1;
}

function readFileCount(directory, suffix) {
  return readFileNames(directory).filter((name) => name.endsWith(suffix)).length;
}

function readFileNames(directory) {
  return existsSync(directory) ? readdirSync(directory) : [];
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href) {
  main();
}
