import { describe, expect, it } from "vitest";
import { getProductEligibility, productEligibilitySchema } from "./product-tier";

describe("getProductEligibility", () => {
  it("routes an empty CREATE user away from QUICK", () => {
    const eligibility = getProductEligibility("CREATE", "");
    expect(eligibility.quick.eligible).toBe(false);
    expect(eligibility.quick.reason).toContain("첨삭할 원문");
    expect(eligibility.pro.eligible).toBe(true);
  });

  it("allows BUILD and POLISH users to choose either tier", () => {
    expect(getProductEligibility("BUILD", "초안").quick.eligible).toBe(true);
    expect(getProductEligibility("POLISH", "완성한 지원서").pro.eligible).toBe(true);
  });

  it("keeps the decision inside the public contract", () => {
    expect(productEligibilitySchema.safeParse(getProductEligibility("CREATE", "")).success).toBe(true);
  });
});
