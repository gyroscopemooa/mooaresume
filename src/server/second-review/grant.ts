// Server/CLI only. Never import into a client component.
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const grantSchema = z.object({
  v: z.literal(1), run: z.string().uuid(), preview: z.string().uuid(),
  recipient: z.string().regex(/^[a-f0-9]{64}$/), content: z.string().regex(/^[a-f0-9]{64}$/),
  expires: z.number().int().positive(),
}).strict();
export type SecondReviewGrant = z.infer<typeof grantSchema>;
const mac = (secret: string, purpose: string, value: string) => createHmac("sha256", secret).update(`mooa:second-review:v1:${purpose}:${value}`).digest("hex");
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const recipientDigest = (email: string, secret: string) => mac(secret, "recipient", email.trim().toLowerCase());
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
export const reviewedContentDigest = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
export function signSecondReviewGrant(grant: SecondReviewGrant, secret: string, now = Date.now()) {
  if (secret.length < 16) throw new Error("DELIVERY_SECRET_UNAVAILABLE");
  const parsed = grantSchema.parse(grant);
  if (parsed.expires <= now || parsed.expires > now + 7 * 86400_000) throw new Error("INVALID_DELIVERY_EXPIRY");
  const payload = Buffer.from(JSON.stringify(parsed)).toString("base64url");
  return `${payload}.${mac(secret, "grant", payload)}`;
}
export function readSecondReviewGrant(token: string, secret: string, now = Date.now()): SecondReviewGrant | null {
  if (secret.length < 16 || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[a-f0-9]{64}$/.test(parts[1])) return null;
  if (!equal(parts[1], mac(secret, "grant", parts[0]))) return null;
  try {
    const parsed = grantSchema.safeParse(JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")));
    return parsed.success && parsed.data.expires > now ? parsed.data : null;
  } catch { return null; }
}
export function canReadSecondReview(grant: SecondReviewGrant, user: { email?: string; email_confirmed_at?: string } | null, secret: string) {
  return Boolean(user?.email && user.email_confirmed_at && equal(grant.recipient, recipientDigest(user.email, secret)));
}
