import { describe, expect, it } from "vitest";
import { CAREER_VALUES, getValueReflectionPrompt } from "./career-values";

describe("career values reflection", () => {
  it("keeps user-facing value choices unique and explainable", () => {
    expect(new Set(CAREER_VALUES.map((value) => value.id)).size).toBe(CAREER_VALUES.length);
    expect(getValueReflectionPrompt("growth")).toContain("경험");
  });
});
