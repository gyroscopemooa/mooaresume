import { describe, expect, it } from "vitest";
import { canReadSecondReview, readSecondReviewGrant, recipientDigest, reviewedContentDigest, signSecondReviewGrant } from "./grant";

const secret = "test-signing-secret-not-for-production";
const now = 1_800_000_000_000;
const grant = {
  v: 1 as const, run: "11111111-1111-4111-8111-111111111111", preview: "22222222-2222-4222-8222-222222222222",
  recipient: recipientDigest("test@example.com", secret), content: reviewedContentDigest([{ text: "검토본" }]), expires: now + 86400_000,
};
describe("recipient-bound second-review grant", () => {
  it("round trips without disclosing the email in the payload", () => {
    const token = signSecondReviewGrant(grant, secret, now);
    expect(readSecondReviewGrant(token, secret, now)).toEqual(grant);
    expect(Buffer.from(token.split(".")[0], "base64url").toString()).not.toContain("test@example.com");
  });
  it("rejects modified signatures, payloads, wrong keys and expired grants", () => {
    const token = signSecondReviewGrant(grant, secret, now);
    expect(readSecondReviewGrant(`${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`, secret, now)).toBeNull();
    expect(readSecondReviewGrant(`A${token.slice(1)}`, secret, now)).toBeNull();
    expect(readSecondReviewGrant(token, "different-secret-long-enough", now)).toBeNull();
    expect(readSecondReviewGrant(token, secret, grant.expires)).toBeNull();
    expect(readSecondReviewGrant("garbage", secret, now)).toBeNull();
    expect(() => signSecondReviewGrant({ ...grant, expires: now + 8 * 86400_000 }, secret, now)).toThrow();
  });
  it("requires both verified identity and exact recipient; possessing a link is insufficient", () => {
    expect(canReadSecondReview(grant, null, secret)).toBe(false);
    expect(canReadSecondReview(grant, { email: "test@example.com" }, secret)).toBe(false);
    expect(canReadSecondReview(grant, { email: "other@example.com", email_confirmed_at: "confirmed" }, secret)).toBe(false);
    expect(canReadSecondReview(grant, { email: "TEST@example.com", email_confirmed_at: "confirmed" }, secret)).toBe(true);
  });
  it("hashes JSONB key order consistently and detects changed review text", () => {
    expect(reviewedContentDigest({ a: 1, b: 2 })).toBe(reviewedContentDigest({ b: 2, a: 1 }));
    expect(reviewedContentDigest({ text: "이전" })).not.toBe(reviewedContentDigest({ text: "수정" }));
  });
});
