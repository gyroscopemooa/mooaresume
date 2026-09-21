import { afterEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => db }));
vi.mock("@/server/notifications/run-failure-alert-email", () => ({ alertExhaustedRun: vi.fn() }));
vi.mock("@/server/billing/quick-failure-refund", () => ({ refundExhaustedRun: vi.fn() }));
vi.mock("@/server/notifications/refund-notice-email", () => ({ notifyRefundedApplicant: vi.fn() }));
import { SupabaseQuickAnalysisRunRepository } from "./supabase-quick-analysis-run-repository";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("revision history owner boundary", () => {
  it("filters by owner and exact context before applying the history limit", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co"); vi.stubEnv("SUPABASE_SECRET_KEY", "test-only");
    const runId = "11111111-1111-4111-8111-111111111111";
    db.rpc.mockResolvedValue({ data: { analysisRunId: runId, request: { requestId: "case", product: "PRO", writingMode: "POLISH", writingStyle: "BALANCED", targetLength: 500, documents: [{ kind: "cover_letter", text: "내 원문" }] } }, error: null });
    const events: unknown[][] = [];
    const builder = {
      select: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation((...args: unknown[]) => { events.push(["eq", ...args]); return builder; }),
      lt: vi.fn().mockImplementation((...args: unknown[]) => { events.push(["lt", ...args]); return builder; }),
      order: vi.fn().mockImplementation(() => builder),
      maybeSingle: vi.fn().mockResolvedValue({ data: { attempt_count: 1, created_at: "2026-09-22T00:00:00Z" } }),
      limit: vi.fn().mockImplementation((limit: number) => { events.push(["limit", limit]); return Promise.resolve({ data: [], error: null }); }),
    };
    db.from.mockReturnValue(builder);
    const result = await new SupabaseQuickAnalysisRunRepository("current-owner").begin(runId);
    expect(result.request.previousRevision).toBeUndefined();
    expect(events).toContainEqual(["eq", "owner_user_id", "current-owner"]);
    expect(events).toContainEqual(["lt", "created_at", "2026-09-22T00:00:00Z"]);
    const fingerprint = events.find(e => e[1] === "result_data->revisionQuality->>contextFingerprint");
    expect(fingerprint?.[2]).toMatch(/^[a-f0-9]{64}$/);
    expect(events.at(-1)).toEqual(["limit", 20]);
  });
});
