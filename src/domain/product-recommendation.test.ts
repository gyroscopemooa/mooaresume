import { describe, expect, it } from "vitest";
import { getProductEligibility } from "./product-tier";
import { getProductDestination, recommendProduct } from "./product-recommendation";

describe("product recommendation and navigation", () => {
  it("disables QUICK and recommends PRO for CREATE", () => {
    const eligibility = getProductEligibility("CREATE", "");
    const result = recommendProduct("CREATE", eligibility);
    expect(result.eligibility.quick.eligible).toBe(false);
    expect(result.recommendedTier).toBe("PRO");
    expect(getProductDestination("PRO", "CREATE")).toBe("/pro/create");
  });

  it("enables the QUICK button for BUILD", () => {
    const eligibility = getProductEligibility("BUILD", "작성 중인 초안");
    expect(eligibility.quick.eligible).toBe(true);
    expect(getProductDestination("QUICK", "BUILD")).toBe("/quick");
    expect(getProductDestination("PRO", "BUILD")).toBe("/pro/build");
  });

  it("enables and recommends QUICK for POLISH", () => {
    const eligibility = getProductEligibility("POLISH", "제출 직전의 완성된 지원서");
    const result = recommendProduct("POLISH", eligibility);
    expect(result.eligibility.quick.eligible).toBe(true);
    expect(result.recommendedTier).toBe("QUICK");
    expect(getProductDestination("QUICK", "POLISH")).toBe("/quick");
    expect(getProductDestination("PRO", "POLISH")).toBe("/pro/polish");
  });
});
