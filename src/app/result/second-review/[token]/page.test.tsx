import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), preview: vi.fn(), db: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.user } }) }));
vi.mock("@/server/admin/admin-analysis-previews", () => ({ getAdminAnalysisPreview: mocks.preview }));
vi.mock("@/server/admin/admin-repository", () => ({ serviceClient: mocks.db }));
vi.mock("@/components/result-sign-in", () => ({ ResultSignIn: () => null }));
vi.mock("@/components/result-workspace-complete", () => ({ ResultWorkspaceComplete: () => null }));
import Page from "./page";
import { recipientDigest, reviewedContentDigest, signSecondReviewGrant } from "@/server/second-review/grant";
const secret = "test-only-secret-for-delivery";
const token = () => signSecondReviewGrant({ v: 1, run: "11111111-1111-4111-8111-111111111111", preview: "22222222-2222-4222-8222-222222222222", recipient: recipientDigest("test@example.com", secret), content: reviewedContentDigest([]), expires: Date.now() + 86400_000 }, secret);
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("SECOND_REVIEW_SIGNING_SECRET", secret); });
describe("recipient page fails closed before elevated database reads", () => {
  it("invalid token does not query auth or data", async () => {
    await expect(Page({ params: Promise.resolve({ token: "invalid" }) })).rejects.toThrow("NOT_FOUND");
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it.each([null, { email: "other@example.com", email_confirmed_at: "confirmed" }, { email: "test@example.com" }])("unauthorized identity never reads the review", async user => {
    mocks.user.mockResolvedValue({ data: { user } });
    await Page({ params: Promise.resolve({ token: token() }) });
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("changed saved content is rejected before loading source documents", async () => {
    mocks.user.mockResolvedValue({ data: { user: { email: "test@example.com", email_confirmed_at: "confirmed" } } });
    mocks.preview.mockResolvedValue({ revisedAnswers: ["changed"] });
    await expect(Page({ params: Promise.resolve({ token: token() }) })).rejects.toThrow("NOT_FOUND");
    expect(mocks.db).not.toHaveBeenCalled();
  });
});
