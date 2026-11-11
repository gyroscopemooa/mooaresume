import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as execute } from "./route";
import { POST as advance } from "@/app/api/analysis-runs/advance/route";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), getUserById: vi.fn(), complete: vi.fn(), fail: vi.fn(), send: vi.fn(), step: vi.fn() }));
const owner = "3b6a0483-61ba-4783-b6b9-458e2630cad1";
const run = "a5779a5b-cded-4dd4-a418-bf07300a0a74";
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { admin: { getUserById: mocks.getUserById } }, from: (table: string) => {
  const query = { select: () => query, eq: () => query, order: () => query, limit: async () => ({ data: table === "analysis_runs" ? [{ id: run, owner_user_id: owner, started_at: new Date().toISOString() }] : [], error: null }) };
  return query;
} }) }));
vi.mock("@/server/notifications/analysis-complete-email", () => ({ sendAnalysisCompleteEmail: mocks.send }));
vi.mock("@/server/analysis/supabase-quick-analysis-run-repository", () => ({ SupabaseQuickAnalysisRunRepository: class { complete = mocks.complete; fail = mocks.fail; } }));
vi.mock("@/server/analysis/quick-background-execution", () => ({ advanceQuickBackgroundAnalysis: mocks.step }));
vi.mock("@/server/analysis/attempt-ledger", () => ({ recordAnalysisAttempt: vi.fn() }));
vi.mock("@/server/ai/quick/openai-responses-gateway", () => ({ OpenAIResponsesGateway: class {} }));
vi.mock("@/server/ai/quick/provider", () => ({ createQuickAnalysisResult: () => ({}), QuickQuestionResultMissingError: class extends Error {} }));
vi.mock("@/server/ai/quick/validator", () => ({ validateQuickAnalysis: () => [], BLOCKING_VALIDATION_CODES: new Set(), describeValidationFailure: () => "" }));
vi.mock("@/server/second-review/automatic-repository", () => ({ advanceAutomaticReviewBatch: async () => ({ status: "not_run" }) }));
const verified = { id: owner, email: "customer@example.com", email_confirmed_at: "2026-11-11", app_metadata: { provider: "kakao" } };
const opted = { ...verified, app_metadata: { ...verified.app_metadata, mooa_delivery_preference: { version: 1, mode: "dashboard_only", user_id: owner, updated_at: "2026-11-11T00:00:00Z" } } };
beforeEach(() => {
  vi.resetAllMocks();
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", SUPABASE_SECRET_KEY: "mock", OPENAI_API_KEY: "mock", OPENAI_MODEL: "mock", ANALYSIS_CRON_SECRET: "mock", NEXT_PUBLIC_SITE_URL: "https://mooaresume.com" })) vi.stubEnv(key, value);
  mocks.getUser.mockResolvedValue({ data: { user: verified }, error: null });
  mocks.getUserById.mockResolvedValue({ data: { user: verified }, error: null });
  mocks.step.mockResolvedValue({ status: "completed", request: {}, response: { status: "completed", result: { output: {}, execution: {} } } });
});
afterEach(() => vi.unstubAllEnvs());
const executeRequest = () => new NextRequest("https://mooaresume.com/api/analysis-runs/quick/execute", { method: "POST", body: JSON.stringify({ analysisRunId: run }) });
const advanceRequest = () => new NextRequest("https://mooaresume.com/api/analysis-runs/advance", { method: "POST", headers: { authorization: "Bearer mock" } });
describe("automatic completion delivery preference", () => {
  it("re-reads Auth after synchronous work and suppresses a newly opted-out verified user", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: verified }, error: null }).mockResolvedValueOnce({ data: { user: opted }, error: null });
    const response = await execute(executeRequest());
    expect(response.status).toBe(200);
    expect(mocks.complete).toHaveBeenCalled();
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it.each(["error", "different-user", "unverified"])("fails closed for fresh synchronous lookup %s", async (mode) => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: verified }, error: null }).mockResolvedValueOnce({ data: { user: { ...verified, id: mode === "different-user" ? "other" : owner, email_confirmed_at: mode === "unverified" ? null : verified.email_confirmed_at } }, error: mode === "error" ? new Error("lookup") : null });
    expect((await execute(executeRequest())).status).toBe(200);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("keeps verified email-mode delivery", async () => {
    expect((await execute(executeRequest())).status).toBe(200);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: verified.email }));
  });
  it.each([opted, { ...verified, email_confirmed_at: null }, { ...verified, id: "other" }])("suppresses asynchronous delivery from fresh preference/identity", async (user) => {
    mocks.getUserById.mockResolvedValue({ data: { user }, error: null });
    expect((await advance(advanceRequest())).status).toBe(200);
    expect(mocks.complete).toHaveBeenCalled();
    expect(mocks.getUserById).toHaveBeenCalledWith(owner);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("preserves asynchronous verified email-mode delivery", async () => {
    expect((await advance(advanceRequest())).status).toBe(200);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: verified.email }));
  });
});

it("dashboard choice does not bypass execution entitlement/ownership refusal", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: opted }, error: null });
  mocks.step.mockRejectedValue(new Error("ENTITLEMENT_NOT_FOUND"));
  const response = await execute(executeRequest());
  expect(response.status).not.toBe(200);
  expect(mocks.complete).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
});
