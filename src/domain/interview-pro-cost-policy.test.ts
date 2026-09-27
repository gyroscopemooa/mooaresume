import { describe, expect, it } from "vitest";
import {
  canStartInterviewProAiCall,
  getInterviewProCostState,
  INTERVIEW_PRO_COST_POLICY,
} from "./interview-pro-cost-policy";

describe("interview PRO cost policy", () => {
  it("keeps the confirmed 59,000 KRW product and 10,000 KRW hard limit", () => {
    expect(INTERVIEW_PRO_COST_POLICY.productPriceKrw).toBe(59_000);
    expect(INTERVIEW_PRO_COST_POLICY.targetAverageMaxKrw).toBe(5_000);
    expect(INTERVIEW_PRO_COST_POLICY.hardLimitKrw).toBe(10_000);
  });

  it("moves through warning and restriction states at the exact boundaries", () => {
    expect(getInterviewProCostState(6_999)).toBe("healthy");
    expect(getInterviewProCostState(7_000)).toBe("soft_warning");
    expect(getInterviewProCostState(9_000)).toBe("restrict_astra_high");
    expect(getInterviewProCostState(10_000)).toBe("hard_stop");
  });

  it("blocks a call that could exceed the purchase hard limit", () => {
    expect(canStartInterviewProAiCall({
      accumulatedCostKrw: 9_600,
      estimatedMaximumCallCostKrw: 401,
      requiresAstraHigh: false,
    })).toBe(false);
    expect(canStartInterviewProAiCall({
      accumulatedCostKrw: 9_600,
      estimatedMaximumCallCostKrw: 400,
      requiresAstraHigh: false,
    })).toBe(true);
    expect(canStartInterviewProAiCall({
      accumulatedCostKrw: 10_000,
      estimatedMaximumCallCostKrw: 0,
      requiresAstraHigh: false,
    })).toBe(false);
  });

  it("stops Astra High at 9,000 KRW while allowing a bounded cheaper call", () => {
    expect(canStartInterviewProAiCall({
      accumulatedCostKrw: 9_000,
      estimatedMaximumCallCostKrw: 300,
      requiresAstraHigh: true,
    })).toBe(false);
    expect(canStartInterviewProAiCall({
      accumulatedCostKrw: 9_000,
      estimatedMaximumCallCostKrw: 300,
      requiresAstraHigh: false,
    })).toBe(true);
  });
});
