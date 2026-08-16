import { describe, expect, it } from "vitest";
import { countNonWhitespaceCharacters, createQuickCheckoutQuote, toQuickCheckoutMetadata } from "./usage-entitlement";

describe("QUICK usage entitlement", () => {
  it("counts all question text without whitespace", () => {
    expect(countNonWhitespaceCharacters(["첫 문항 답변", "두 번째\n답변"])).toBe(10);
  });

  it("keeps a normal same-case overage inside the included grace range", () => {
    const quote = createQuickCheckoutQuote(10_350);
    expect(quote.extraBlocks).toBe(0);
    expect(quote.totalPriceKrw).toBe(4_900);
    expect(quote.allowedCharacters).toBe(12_000);
  });

  it("adds one configurable block after the included boundary", () => {
    const quote = createQuickCheckoutQuote(12_001);
    expect(quote.extraBlocks).toBe(1);
    expect(quote.extraCharacters).toBe(7_000);
    expect(quote.totalPriceKrw).toBe(7_800);
    expect(quote.needsScopeReview).toBe(true);
  });

  it("creates checkout metadata without storing resume text", () => {
    expect(toQuickCheckoutMetadata(createQuickCheckoutQuote(18_000), "case-1")).toEqual({
      applicationCaseId: "case-1",
      tier: "QUICK",
      totalCharacters: 18_000,
      baseCharacters: 7_000,
      includedCharacters: 12_000,
      extraBlocks: 1,
      allowedCharacters: 19_000,
    });
  });
});

