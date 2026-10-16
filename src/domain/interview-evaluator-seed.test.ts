import { describe, expect, it } from "vitest";
import { EVALUATOR_SEED, evaluatorDraftSchema } from "./interview-evaluator-seed";
const valid = { seedId: EVALUATOR_SEED.id, reason: "기본 배점 검토", weights: [20, 25, 15, 15, 10, 10, 5], savedAt: "2026-09-28T00:00:00.000Z" };
describe("evaluator seed drafts", () => {
  it("preserves source allocation", () => expect(EVALUATOR_SEED.dimensions.map((item) => item.weight)).toEqual(valid.weights));
  it("accepts a documented draft", () => expect(evaluatorDraftSchema.safeParse(valid).success).toBe(true));
  it("rejects bad totals", () => expect(evaluatorDraftSchema.safeParse({ ...valid, weights: [20, 25, 15, 15, 10, 10, 4] }).success).toBe(false));
  it("requires change rationale", () => expect(evaluatorDraftSchema.safeParse({ ...valid, reason: " " }).success).toBe(false));
  it("rejects non-finite or negative inputs", () => { for (const value of [NaN, Infinity, -1]) expect(evaluatorDraftSchema.safeParse({ ...valid, weights: [value, 25, 15, 15, 10, 10, 5] }).success).toBe(false); });
});
