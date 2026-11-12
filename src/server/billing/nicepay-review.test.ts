import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildNicepayReviewFields, escapeNicepayHtml, nicepayReviewConfigured, renderNicepayReview } from "./nicepay-review";
import { POST } from "@/app/api/meensoo/nicepay-review/window/route";
import { POST as returned, GET as getReturn } from "@/app/api/meensoo/nicepay-review/return/route";
import { isAdminRequest } from "@/server/admin/admin-session";

vi.mock("@/server/admin/admin-session", () => ({ isAdminRequest: vi.fn(() => false) }));
const key = Buffer.alloc(64, 7).toString("base64");
const config = { mid: "test00001m", merchantKey: key };
const origin = "https://mooaresume.com";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); vi.mocked(isAdminRequest).mockReturnValue(false); });

describe("NICE server-side connection fields", () => {
  it("signs the official KST date+MID+amount+key and excludes the key from HTML", () => {
    const fields = buildNicepayReviewFields({ request: { product: "QUICK", method: "CARD" }, config, origin, now: new Date("2026-11-12T00:01:02Z") });
    expect(fields.EdiDate).toBe("20261112090102");
    expect(fields.Amt).toBe("9900");
    expect(fields.SignData).toBe(createHash("sha256").update(fields.EdiDate + config.mid + fields.Amt + key).digest("hex"));
    expect(fields.Moid).toMatch(/^mooaReview[a-f0-9]{32}$/);
    expect(fields.ReturnURL).toBe(origin + "/api/meensoo/nicepay-review/return");
    const html = renderNicepayReview(fields);
    expect(html).not.toContain(key);
    expect(html).not.toContain("MerchantKey");
    expect(html).not.toContain(".submit()");
    expect(html).toContain("nicepay-pgweb.js");
    expect(html).toContain("실제 구매 불가");
  });
  it("adds the official direct-Kakao fields only for the verified method", () => {
    const fields = buildNicepayReviewFields({ request: { product: "PRO", method: "KAKAO" }, config, origin });
    expect(fields.DirectEasyPay).toBe("E016");
    expect(fields.DirectShowOpt).toBe("CARD");
    expect(fields.Amt).toBe("19900");
    expect(() => buildNicepayReviewFields({ request: { product: "PRO", method: "TOSS" } as never, config, origin })).toThrow();
  });
  it("keeps server configuration disabled by default and requires valid merchant settings", () => {
    expect(nicepayReviewConfigured({})).toBe(false);
    expect(nicepayReviewConfigured({ NICEPAY_REVIEW_ENABLED: "true" })).toBe(false);
    expect(nicepayReviewConfigured({ NICEPAY_REVIEW_ENABLED: "true", NICEPAY_REVIEW_MID: config.mid, NICEPAY_REVIEW_MERCHANT_KEY: key })).toBe(true);
  });
  it("escapes every HTML attribute metacharacter", () => {
    expect(escapeNicepayHtml('<&>"\'')).toBe("&lt;&amp;&gt;&quot;&#39;");
  });
});

function request(body = "product=QUICK&method=CARD", requestOrigin = origin) {
  return new Request(origin + "/api/meensoo/nicepay-review/window", { method: "POST", headers: { origin: requestOrigin }, body });
}
function configured() {
  vi.mocked(isAdminRequest).mockReturnValue(true);
  vi.stubEnv("NICEPAY_REVIEW_ENABLED", "true"); vi.stubEnv("NICEPAY_REVIEW_MID", config.mid); vi.stubEnv("NICEPAY_REVIEW_MERCHANT_KEY", key);
}
describe("NICE review boundaries", () => {
  it("rejects unauthenticated access before generating payment fields", async () => { expect((await POST(request())).status).toBe(401); });
  it("rejects foreign or missing origins", async () => {
    configured(); expect((await POST(request(undefined, "https://other.example"))).status).toBe(403);
    expect((await POST(new Request(origin + "/api/meensoo/nicepay-review/window", { method: "POST" }))).status).toBe(403);
  });
  it("does not expose fields while the feature is unconfigured", async () => {
    vi.mocked(isAdminRequest).mockReturnValue(true); vi.stubEnv("NICEPAY_REVIEW_ENABLED", "false");
    expect((await POST(request())).status).toBe(503);
  });
  it.each(["product=QUICK&method=TOSS", "product=QUICK&method=CARD&Amt=1", "product=UNKNOWN&method=CARD"])("rejects untrusted fields: %s", async body => {
    configured(); expect((await POST(request(body))).status).toBe(400);
  });
  it("limits request size", async () => { configured(); expect((await POST(request("a".repeat(1025)))).status).toBe(413); });
  it("serves a private no-store form with server-owned amount", async () => {
    configured(); const response = await POST(request());
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    const html = await response.text(); expect(html).toContain('name="Amt" value="9900"'); expect(html).not.toContain(key);
  });
  it("never interprets a success callback as approval or fulfillment", async () => {
    expect((await returned()).status).toBe(409); expect((await getReturn()).status).toBe(409);
    expect(await (await returned()).text()).toContain("승인 처리 안 함");
  });
});
