import { describe, expect, it } from "vitest";
import { INTEREST_ITEMS, scoreCareerInterest } from "./career-interest";

describe("career interest scoring", () => {
  it("scores a complete exploratory response set", () => {
    const answers = Object.fromEntries(INTEREST_ITEMS.map((item) => [item.id, item.dimension === "investigative" ? 5 : 1])) as Record<string, 1 | 2 | 3 | 4 | 5>;
    expect(scoreCareerInterest(answers).find((score) => score.dimension === "investigative")?.score).toBe(100);
  });
});
