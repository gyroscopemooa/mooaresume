import { describe, expect, it } from "vitest";
import { encouragementMessages, nextEncouragementIndex } from "./encouragement";
describe("encouragement", () => {
  it("provides sixty unique original messages", () => {
    expect(encouragementMessages).toHaveLength(60);
    expect(new Set(encouragementMessages.map(item => item.body)).size).toBe(60);
  });
  it("next message is always different and within bounds", () => {
    for(let current = 0; current < 60; current++) for(const random of [0, .4, .999999, 1]) {
      const next = nextEncouragementIndex(current, random);
      expect(next).not.toBe(current);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(60);
    }
  });
});
