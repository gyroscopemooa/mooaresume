import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildApplicationCasePlan, guestApplicationHandoffSchema } from "@/application/application-case-handoff";
import { sampleResultDocument } from "@/fixtures/result-document";
import { REVISION_RUBRIC_VERSION } from "@/domain/revision-quality";
import { revisionFingerprints } from "@/server/ai/quick/revision-quality";
import { findReusableAnalysis, reusableRequest } from "./reuse-analysis";

const plan = buildApplicationCasePlan(guestApplicationHandoffSchema.parse({ product: "QUICK", writingMode: "BUILD", writingStyle: "BALANCED", targetLength: 700, questions: [{ id: "q", title: "", prompt: "", answer: "가상의 원문입니다.", targetLength: null }] }));
const request = reusableRequest(plan)!;
const fingerprints = revisionFingerprints(request);
const result = { ...sampleResultDocument, revisionQuality: { version: REVISION_RUBRIC_VERSION, reviewerResponseId: "reviewer", reviewerModel: "test", decision: "keep_current", reason: "유지", beforeScore: 75, candidateScore: 75, ...fingerprints, parentAnalysisRunId: null, relationship: "new" } };
function database(rows: unknown[] = [], error: unknown = null, completed = true) {
  const events: unknown[][] = [];
  const builder = {
    select: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation((...args: unknown[]) => { events.push(args); return builder; }),
    order: vi.fn().mockImplementation(() => builder),
    limit: vi.fn().mockResolvedValue({ data: rows, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: completed ? { id: "existing-run" } : null, error: null }),
  };
  return { client: { from: vi.fn().mockReturnValue(builder) } as unknown as SupabaseClient, events };
}
describe("pre-payment exact-result reuse", () => {
  it("uses owner, both fingerprints and completed status before returning a result", async () => {
    const db = database([{ analysis_run_id: "existing-run", result_data: result }]);
    expect(await findReusableAnalysis(db.client, "owner", plan)).toBe("existing-run");
    expect(db.events).toContainEqual(["owner_user_id", "owner"]);
    expect(db.events).toContainEqual(["result_data->revisionQuality->>inputFingerprint", fingerprints.inputFingerprint]);
    expect(db.events).toContainEqual(["result_data->revisionQuality->>contextFingerprint", fingerprints.contextFingerprint]);
    expect(db.events).toContainEqual(["status", "COMPLETED"]);
  });
  it("does not reuse legacy, mismatched or unfinished results", async () => {
    for (const data of [sampleResultDocument, { ...result, revisionQuality: { ...result.revisionQuality, inputFingerprint: "different" } }]) {
      expect(await findReusableAnalysis(database([{ analysis_run_id: "old", result_data: data }]).client, "owner", plan)).toBeNull();
    }
    expect(await findReusableAnalysis(database([{ analysis_run_id: "old", result_data: result }], null, false).client, "owner", plan)).toBeNull();
  });
  it("fails closed on lookup errors before any charge", async () => {
    await expect(findReusableAnalysis(database([], { code: "DB_ERROR" }).client, "owner", plan)).rejects.toThrow("REUSE_LOOKUP_FAILED");
  });
  it("does not guess evidence equivalence outside shared execution budgets", () => {
    expect(reusableRequest({ ...plan, documents: [{ ...plan.documents[0], normalizedText: "가".repeat(10_001) }] })).toBeNull();
    expect(reusableRequest({ ...plan, documents: [...plan.documents, { ...plan.documents[0], kind: "RESUME" }] })).toBeNull();
    expect(revisionFingerprints({ ...request, writingMode: "POLISH" })).not.toEqual(fingerprints);
  });
});
