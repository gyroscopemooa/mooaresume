import { describe, expect, it } from "vitest";
import { resolveWorkflow } from "./workflow";
import type { ProductTier } from "./product-tier";
import type { WritingMode } from "./writing-mode";

describe("resolveWorkflow", () => {
  const cases: Array<[WritingMode, ProductTier, boolean, string]> = [
    ["CREATE", "QUICK", false, "NOT_ELIGIBLE"],
    ["BUILD", "QUICK", true, "QUICK_EDIT"],
    ["POLISH", "QUICK", true, "QUICK_EDIT"],
    ["CREATE", "PRO", true, "GUIDED_CREATE"],
    ["BUILD", "PRO", true, "PRO_ENHANCE"],
    ["POLISH", "PRO", true, "PRO_FINAL_REVIEW"],
    ["CREATE", "FINAL", true, "GUIDED_CREATE"],
    ["BUILD", "FINAL", true, "PRO_ENHANCE"],
    ["POLISH", "FINAL", true, "PRO_FINAL_REVIEW"],
  ];

  it.each(cases)("keeps %s + %s explicit", (mode, tier, eligible, expected) => {
    const result = resolveWorkflow(mode, tier);
    expect(result.eligible).toBe(eligible);
    if (result.eligible) expect(result.workflow).toBe(expected);
  });

  it("adds interview on top of PRO for FINAL", () => {
    const result = resolveWorkflow("BUILD", "FINAL");
    expect(result).toEqual({
      eligible: true,
      workflow: "PRO_ENHANCE",
      layers: ["INTERVIEW_LAYER"],
      entitlements: ["PRO_ANALYSIS", "AI_INTERVIEW"],
    });
  });
});
