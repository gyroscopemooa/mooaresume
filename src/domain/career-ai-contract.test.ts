import { describe, expect, it } from "vitest";
import { careerInterpretationOutputSchema, careerInterpretationRequestSchema, validateCareerInterpretationOutput } from "./career-ai-contract";

describe("career AI interpretation contract", () => {
  it("requires at least one scored assessment", () => {
    expect(careerInterpretationRequestSchema.safeParse({ schemaVersion: "1.0", purpose: "career_profile" }).success).toBe(false);
  });
  it("rejects employment prediction claims after schema parsing", () => {
    const output = careerInterpretationOutputSchema.parse({ schemaVersion: "1.0", profileSummary: "합격 확률이 높습니다.", workEnvironmentHypotheses: [], experiencePrompts: [], jobPostingQuestions: [], limitations: ["검사 결과는 자기이해 자료입니다."] });
    expect(validateCareerInterpretationOutput(output)).toHaveLength(1);
  });
});
