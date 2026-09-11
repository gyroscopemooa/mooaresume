import "server-only";

import { google } from "googleapis";
import type { ProductTier } from "@/domain/usage-entitlement";
import { MAX_GOOGLE_PLAY_EXTRA_BLOCKS } from "@/domain/google-play-billing";

/**
 * Google Play Billing configuration — same three-function shape as
 * polar-checkout.ts (getXConfiguration / describeXConfigShape /
 * classifyXFailure), kept separate from it rather than merged into it. Polar
 * and Google Play are two different providers with different auth models
 * (API token vs. service-account JWT) and different failure vocabularies; a
 * shared "payment config" abstraction would have to paper over that
 * difference for no real benefit.
 */

export type GooglePlayConfiguration = {
  packageName: string;
  serviceAccountEmail: string;
  serviceAccountPrivateKey: string;
  /**
   * One ladder per tier: index 0 is the base product (0 extra blocks), index
   * n is the product priced for n extra blocks. A missing rung (empty
   * string) means that many extra blocks cannot be bought through Play yet —
   * see MAX_GOOGLE_PLAY_EXTRA_BLOCKS and google-play-verification.ts.
   */
  productIds: Record<ProductTier, ReadonlyArray<string>>;
};

function readProductIdLadder(tier: ProductTier): string[] {
  const envKeyFor = (extraBlocks: number) => extraBlocks === 0
    ? `GOOGLE_PLAY_${tier}_PRODUCT_ID`
    : `GOOGLE_PLAY_${tier}_EXTRA_${extraBlocks}_PRODUCT_ID`;
  const ladder: string[] = [];
  for (let extraBlocks = 0; extraBlocks <= MAX_GOOGLE_PLAY_EXTRA_BLOCKS; extraBlocks += 1) {
    ladder.push(process.env[envKeyFor(extraBlocks)] ?? "");
  }
  return ladder;
}

function parseServiceAccountJson(raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON이 올바른 JSON이 아닙니다.");
  }
  const record = parsed as { client_email?: unknown; private_key?: unknown };
  if (typeof record.client_email !== "string" || typeof record.private_key !== "string") {
    throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON에 client_email/private_key가 없습니다.");
  }
  return { email: record.client_email, privateKey: record.private_key };
}

export function getGooglePlayConfiguration(): GooglePlayConfiguration {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  const quickLadder = readProductIdLadder("QUICK");
  const proLadder = readProductIdLadder("PRO");
  // Optional on purpose, same reasoning as POLAR_FINAL_PRODUCT_ID: FINAL has
  // no product configured anywhere yet, and requiring one here would take
  // QUICK/PRO verification down with it. A FINAL purchase attempted without
  // it fails by name instead — see processGooglePlayPurchase's product check.
  const finalLadder = readProductIdLadder("FINAL");

  if (!packageName || !serviceAccountJson || !quickLadder[0] || !proLadder[0]) {
    throw new Error(
      "GOOGLE_PLAY_PACKAGE_NAME, GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, GOOGLE_PLAY_QUICK_PRODUCT_ID, GOOGLE_PLAY_PRO_PRODUCT_ID가 필요합니다.",
    );
  }

  const { email, privateKey } = parseServiceAccountJson(serviceAccountJson);

  return {
    packageName,
    serviceAccountEmail: email,
    serviceAccountPrivateKey: privateKey,
    productIds: { QUICK: quickLadder, PRO: proLadder, FINAL: finalLadder },
  };
}

export function createAndroidPublisherClientFromEnv() {
  const config = getGooglePlayConfiguration();
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.serviceAccountEmail,
      private_key: config.serviceAccountPrivateKey,
    },
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  return { client: google.androidpublisher({ version: "v3", auth }), config };
}

/**
 * 3,000원 "모의면접 재시도 1회" — Google Play 쪽. 같은 서비스 계정·패키지명을
 * 쓰지만 QUICK/PRO/FINAL 사다리와는 무관한 별도 상품 하나라, 그 사다리
 * 타입에 억지로 끼워 넣지 않고 독립된 함수로 둔다.
 */
export function getInterviewRetryGooglePlayConfig() {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  const productId = process.env.GOOGLE_PLAY_INTERVIEW_RETRY_PRODUCT_ID;
  if (!packageName || !serviceAccountJson || !productId) {
    throw new Error("GOOGLE_PLAY_PACKAGE_NAME, GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, GOOGLE_PLAY_INTERVIEW_RETRY_PRODUCT_ID가 필요합니다.");
  }
  const { email, privateKey } = parseServiceAccountJson(serviceAccountJson);
  return { packageName, serviceAccountEmail: email, serviceAccountPrivateKey: privateKey, productId };
}

export function createAndroidPublisherClientForInterviewRetry() {
  const config = getInterviewRetryGooglePlayConfig();
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.serviceAccountEmail,
      private_key: config.serviceAccountPrivateKey,
    },
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  return { client: google.androidpublisher({ version: "v3", auth }), config };
}

/**
 * Shape of the Google Play configuration, with no values in it. Same
 * reasoning as describePolarConfigShape (polar-checkout.ts): a wrong or
 * truncated value should be diagnosable from a log line without ever
 * printing a secret (the service-account private key most of all).
 */
export function describeGooglePlayConfigShape() {
  const describe = (value: string | undefined) => {
    if (!value) return "missing";
    const trimmed = value.trim();
    if (trimmed.length !== value.length) return `padded(len=${value.length})`;
    return `ok(len=${trimmed.length})`;
  };

  let serviceAccountShape = "missing";
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      parseServiceAccountJson(raw);
      serviceAccountShape = "ok(parsed)";
    } catch {
      serviceAccountShape = "invalid_json_or_missing_fields";
    }
  }

  const describeLadder = (tier: ProductTier) => readProductIdLadder(tier).map((value) => describe(value || undefined));

  return {
    packageName: describe(process.env.GOOGLE_PLAY_PACKAGE_NAME),
    serviceAccountJson: serviceAccountShape,
    // Index 0 is the base product, index n is the n-extra-block product —
    // same order as GooglePlayConfiguration.productIds.
    quickProductIds: describeLadder("QUICK"),
    proProductIds: describeLadder("PRO"),
    finalProductIds: describeLadder("FINAL"),
  };
}

/**
 * Turns a failed Google Play Developer API call into a category the operator
 * can act on, the same way classifyPolarFailure does for Polar.
 */
export function classifyGooglePlayFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/GOOGLE_PLAY_PACKAGE_NAME|GOOGLE_PLAY_SERVICE_ACCOUNT_JSON|GOOGLE_PLAY_QUICK_PRODUCT_ID|GOOGLE_PLAY_PRO_PRODUCT_ID가 필요합니다/.test(message)) return "GOOGLE_PLAY_CONFIG_MISSING";
  if (/client_email\/private_key|올바른 JSON/.test(message)) return "GOOGLE_PLAY_SERVICE_ACCOUNT_INVALID";
  if (/\b401\b|\b403\b|[Uu]nauthorized|[Ff]orbidden|invalid_grant/.test(message)) return "GOOGLE_PLAY_AUTH_REJECTED";
  if (/\b404\b|[Nn]ot ?[Ff]ound/.test(message)) return "GOOGLE_PLAY_PURCHASE_NOT_FOUND";
  if (/\b400\b|[Vv]alidation|[Ii]nvalid/.test(message)) return "GOOGLE_PLAY_REQUEST_REJECTED";
  if (/\b5\d\d\b|timeout|ECONNRESET|fetch failed/i.test(message)) return "GOOGLE_PLAY_UNAVAILABLE";
  return "GOOGLE_PLAY_UNKNOWN";
}
