import { describe, expect, it } from "vitest";
import { scoreWorkStyle, workStyleItems } from "./career-assessment";

describe("scoreWorkStyle", () => {
  it("reverses negatively keyed items and normalizes every scale to 0–100", () => {
    const answers = Object.fromEntries(workStyleItems.map((item) => [item.id, item.direction === 1 ? 5 : 1])) as Record<string, 1 | 2 | 3 | 4 | 5>;
    const scores = scoreWorkStyle(answers);
    expect(scores).toHaveLength(5);
    expect(scores.every((score) => score.score === 100 && score.level === "높음")).toBe(true);
  });

  it("does not allow incomplete answers to produce a profile", () => {
    expect(() => scoreWorkStyle({})).toThrow("모든 문항");
  });
});
