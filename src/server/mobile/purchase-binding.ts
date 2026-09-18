import { createHash } from "node:crypto";
import { MobileHttpError } from "./auth";
export function purchaseBinding(userId: string, runId: string) {
  return {
    accountId: createHash("sha256").update(`mooa:user:${userId}`).digest("hex"),
    profileId: createHash("sha256").update(`mooa:run:${runId}`).digest("hex"),
  };
}
export function assertPurchaseBinding(purchase: { obfuscatedExternalAccountId?: string | null; obfuscatedExternalProfileId?: string | null; regionCode?: string | null }, userId: string, runId: string) {
  const expected = purchaseBinding(userId, runId);
  if (purchase.obfuscatedExternalAccountId !== expected.accountId || purchase.obfuscatedExternalProfileId !== expected.profileId) {
    throw new MobileHttpError(409, "PURCHASE_OWNER_MISMATCH");
  }
  // The existing accounting contract records KRW catalogue prices. Do not
  // represent a global store charge as a verified KRW transaction.
  if (purchase.regionCode !== "KR") throw new MobileHttpError(422, "STORE_REGION_NOT_SUPPORTED");
}
