import { describe, expect, it } from "vitest";
import { stabilityQuestions } from "@/fixtures/quick-stability-case";
import { diceSimilarity } from "./text-similarity";

const [first, second, third, fourth, fifth] = stabilityQuestions.map((question) => question.answer);

describe("diceSimilarity", () => {
  it("is 1 for the same text, whatever the spacing, line breaks or letter case", () => {
    expect(diceSimilarity(first, first)).toBe(1);
    expect(diceSimilarity("A 회사에 지원했습니다.", "a회사에\n지원했습니다.")).toBe(1);
  });

  it("is 0 when either side is empty", () => {
    expect(diceSimilarity("", first)).toBe(0);
    expect(diceSimilarity(first, "   ")).toBe(0);
    expect(diceSimilarity("", "")).toBe(0);
  });

  it("does not depend on which text comes first", () => {
    expect(diceSimilarity(first, second)).toBeCloseTo(diceSimilarity(second, first), 12);
  });

  it("stays high when a couple of sentences of the same text were changed", () => {
    const sentences = first.split(/(?<=\.)\s+/);
    expect(sentences.length).toBeGreaterThan(3);
    const edited = [...sentences.slice(0, -1), "그래서 이번 인턴 기회를 통해 현장에서 더 배우고 싶습니다."].join(" ");
    expect(diceSimilarity(first, edited)).toBeGreaterThan(0.8);
  });

  it("falls well below the line for a different text, even from the same letter", () => {
    for (const [a, b] of [[first, second], [second, third], [third, fourth], [fourth, fifth], [first, fifth]]) {
      expect(diceSimilarity(a, b)).toBeLessThan(0.5);
    }
  });

  it("drops once half of the text was rewritten", () => {
    const half = first.slice(0, Math.floor(first.length / 2));
    expect(diceSimilarity(first, half + second.slice(0, first.length - half.length))).toBeLessThan(0.7);
  });

  it("counts repeated pieces, so a long repeated phrase cannot fake a match", () => {
    expect(diceSimilarity("가나다라마바사".repeat(20), "가나다라마바사")).toBeLessThan(0.3);
  });

  it("handles one-character texts without dividing by zero", () => {
    expect(diceSimilarity("가", "나")).toBe(0);
    expect(diceSimilarity("가", "가")).toBe(1);
  });
});
