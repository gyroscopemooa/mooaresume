import { describe, expect, it } from "vitest";
import { interpretWorkStyle } from "./career-interpretation";
import type { WorkStyleScore } from "./career-assessment";

const scores: WorkStyleScore[] = [
  ["extraversion", "상호작용 선호", 55],
  ["agreeableness", "협업 지향", 70],
  ["conscientiousness", "계획·완수", 88],
  ["emotionalStability", "정서적 안정", 48],
  ["openness", "학습·새로운 방식", 76],
].map(([dimension, label, score]) => ({ dimension: dimension as WorkStyleScore["dimension"], label: label as string, score: score as number, rawScore: 10, level: (score as number) >= 67 ? "높음" : "보통", summary: "", careerPrompt: "" }));

describe("interpretWorkStyle", () => {
  it("returns reproducible, non-diagnostic career prompts tied to scored tendencies", () => {
    const interpretation = interpretWorkStyle(scores);
    expect(interpretation.conclusion).toContain("계획·완수");
    expect(interpretation.workEnvironmentHints[0]?.evidence).toContain("계획·완수 응답 경향: 높음");
    expect(interpretation.limitation).toContain("직무 적합도");
  });
});
