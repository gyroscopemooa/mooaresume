import { describe, expect, it } from "vitest";
import { careerInterpretationOutputSchema, careerInterpretationRequestSchema, validateCareerInterpretationOutput } from "./career-ai-contract";

describe("career AI interpretation contract", () => {
  it("requires at least one scored assessment", () => {
    expect(careerInterpretationRequestSchema.safeParse({ schemaVersion: "1.0", purpose: "career_profile" }).success).toBe(false);
  });
  it("rejects employment prediction claims after schema parsing", () => {
    const five = ["가", "나", "다", "라", "마"];
    const coaching = (["취업 코칭", "진로 코칭", "커리어 코칭"] as const).map((area) => ({ area, summary: "요약", items: [1, 2, 3].map((n) => ({ title: `제목${n}`, text: "내용" })) }));
    const output = careerInterpretationOutputSchema.parse({ schemaVersion: "1.0", profileSummary: "합격 확률이 높습니다.", workEnvironmentHypotheses: [], experiencePrompts: [], jobPostingQuestions: [], limitations: ["검사 결과는 자기이해 자료입니다."], deepInterpretation: "해석", personalityKeywords: five, workStrengths: five, growthDirections: five, idealEnvironments: five, coreValue: "가치", decisionStyle: "결정", communicationPattern: "소통", teamSynergy: "팀", coaching });
    expect(validateCareerInterpretationOutput(output)).toHaveLength(1);
  });
});
