import { describe, expect, it } from "vitest";
import { INTEREST_ITEMS } from "@/domain/career-interest";
import { computeSavedAssessment, saveCareerAssessmentSchema } from "./assessment-persistence";

describe("career assessment persistence", () => {
  it("recomputes interest results from answers instead of accepting client scores", () => {
    const answers = Object.fromEntries(INTEREST_ITEMS.map((item) => [item.id, item.dimension === "social" ? 5 : 1]));
    const input = saveCareerAssessmentSchema.parse({ assessmentCode: "interest", assessmentVersion: "beta", answers });
    expect(computeSavedAssessment(input).find((score) => score.scaleCode === "social")?.normalizedScore).toBe(100);
  });
});
