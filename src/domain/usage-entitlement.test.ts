import { describe, expect, it } from "vitest";
import { countNonWhitespaceCharacters, createQuickCheckoutQuote, toQuickCheckoutMetadata } from "./usage-entitlement";

describe("QUICK usage entitlement", () => {
  it("counts all question text without whitespace", () => {
    expect(countNonWhitespaceCharacters(["첫 문항 답변", "두 번째\n답변"])).toBe(10);
  });

  it("현실적으로 가장 긴 자소서도 포함 범위 안에 든다", () => {
    // 7 questions of 700 characters plus their headings — the longest shape a
    // Korean application realistically takes.
    const quote = createQuickCheckoutQuote(5_800);
    expect(quote.extraBlocks).toBe(0);
    expect(quote.totalPriceKrw).toBe(4_900);
    expect(quote.allowedCharacters).toBe(8_000);
  });

  it("adds one configurable block after the included boundary", () => {
    const quote = createQuickCheckoutQuote(8_001);
    expect(quote.extraBlocks).toBe(1);
    expect(quote.extraCharacters).toBe(7_000);
    expect(quote.totalPriceKrw).toBe(7_800);
    expect(quote.needsScopeReview).toBe(true);
  });

  it("creates checkout metadata without storing resume text", () => {
    expect(toQuickCheckoutMetadata(createQuickCheckoutQuote(14_000), "case-1")).toEqual({
      applicationCaseId: "case-1",
      tier: "QUICK",
      totalCharacters: 14_000,
      baseCharacters: 7_000,
      includedCharacters: 8_000,
      extraBlocks: 1,
      allowedCharacters: 15_000,
    });
  });
});

