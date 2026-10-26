import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

function readEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/u, "$2");
        return [key, value];
      }),
  );
}

const fileEnv = {
  ...readEnvFile(".env"),
  ...readEnvFile(".env.production"),
  ...readEnvFile(".env.local"),
  ...readEnvFile(".env.production.local"),
};

const missingKeys = requiredKeys.filter((key) => !(process.env[key] || fileEnv[key]));

if (missingKeys.length > 0) {
  console.error(
    `Deployment blocked: missing build-time public environment variables: ${missingKeys.join(", ")}`,
  );
  process.exit(1);
}

console.log("Deployment public environment check passed.");
