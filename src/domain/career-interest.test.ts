import { describe, expect, it } from "vitest";
import { INTEREST_DIMENSIONS, INTEREST_ITEMS, getInterestProfile, scoreCareerInterest, type InterestScore } from "./career-interest";

describe("career interest scoring", () => {
  it("scores a complete exploratory response set", () => {
    const answers = Object.fromEntries(INTEREST_ITEMS.map((item) => [item.id, item.dimension === "investigative" ? 5 : 1])) as Record<string, 1 | 2 | 3 | 4 | 5>;
    expect(scoreCareerInterest(answers).find((score) => score.dimension === "investigative")?.score).toBe(100);
  });

  it("creates an ordered three-area exploration code and readable pair name", () => {
    const scoreByCode: Record<string, number> = { I: 90, S: 80, A: 70, R: 30, E: 20, C: 10 };
    const scores = INTEREST_DIMENSIONS.map((dimension) => ({ ...dimension, dimension: dimension.id, score: scoreByCode[dimension.code], level: "보통" })) as InterestScore[];
    expect(getInterestProfile(scores)).toMatchObject({ code: "ISA", typeName: "지식 연결가" });
  });
});