import { afterEach, expect, it, vi } from "vitest";
import { createCheckoutQuote } from "@/domain/usage-entitlement";
const mocks = vi.hoisted(() => ({ reserve: vi.fn(), create: vi.fn() }));
vi.mock("./nicepay-order-repository", () => ({ SupabaseNicepayOrderRepository: class {
  reserve = mocks.reserve; create = mocks.create;
} }));
import { createNicepayCheckout } from "./nicepay-checkout";
const owner = "10000000-0000-4000-8000-000000000001";
const run = "20000000-0000-4000-8000-000000000001";
const context = { analysisRunId: run, applicationCaseId: owner, product: "QUICK", totalCharacters: 8001 };
function enable() {
  vi.stubEnv("NICEPAY_ENABLED", "true"); vi.stubEnv("NICEPAY_PUBLIC_ENABLED", "false");
  vi.stubEnv("NICEPAY_PILOT_USER_IDS", owner); vi.stubEnv("NICEPAY_MID", "test00001m");
  vi.stubEnv("NICEPAY_MERCHANT_KEY", Buffer.alloc(64, 9).toString("base64"));
}
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("prices the authenticated run on the server and returns the persisted snapshot", async () => {
  enable();
  const quote = createCheckoutQuote("QUICK", 8001);
  mocks.create.mockResolvedValue({ id: owner, quote_snapshot: quote, pricing_version: "stored-v1", expires_at: "2026-12-01T00:00:00Z" });
  const result = await createNicepayCheckout({ raw: { analysisRunId: run, method: "EASYPAY" }, userId: owner, origin: "https://mooaresume.com", loadContext: async () => ({ data: context, error: null }) });
  expect(mocks.reserve).toHaveBeenCalledWith(run, owner, "NICEPAY");
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ ownerId: owner, runId: run, quote, test: true }));
  expect(result.quote.totalPriceKrw).toBe(12800); expect(result.pricingVersion).toBe("stored-v1");
  expect(result.checkoutUrl).toBe(`https://mooaresume.com/api/checkouts/nicepay/window?id=${owner}`);
});
it("refuses a caller-supplied amount before reserving an order", async () => {
  enable();
  await expect(createNicepayCheckout({ raw: { analysisRunId: run, method: "CARD", amount: 1 }, userId: owner, origin: "https://mooaresume.com", loadContext: vi.fn() })).rejects.toThrow();
  expect(mocks.reserve).not.toHaveBeenCalled();
});
it("keeps unapproved users out of the pilot even with a valid login", async () => {
  enable(); vi.stubEnv("NICEPAY_PILOT_USER_IDS", "");
  await expect(createNicepayCheckout({ raw: { analysisRunId: run, method: "CARD" }, userId: owner, origin: "https://mooaresume.com", loadContext: vi.fn() })).rejects.toThrow("NICEPAY_NOT_ENABLED");
  expect(mocks.reserve).not.toHaveBeenCalled();
});
