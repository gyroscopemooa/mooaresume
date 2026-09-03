import { describe, expect, it } from "vitest";
import { FINAL_BASE_PRICE_KRW, PRO_BASE_PRICE_KRW, PRO_EXTRA_BLOCK_CHARS, PRO_EXTRA_BLOCK_PRICE_KRW, PRO_INCLUDED_LIMIT_CHARS, countNonWhitespaceCharacters, createFinalCheckoutQuote, createProCheckoutQuote, createQuickCheckoutQuote, quickCostsMoreThanPro, toQuickCheckoutMetadata } from "./usage-entitlement";

describe("QUICK usage entitlement", () => {
  it("counts all question text without whitespace", () => {
    expect(countNonWhitespaceCharacters(["첫 문항 답변", "두 번째\n답변"])).toBe(10);
  });

  it("현실적으로 가장 긴 자소서도 포함 범위 안에 든다", () => {
    // 7 questions of 700 characters plus their headings — the longest shape a
    // Korean application realistically takes.
    const quote = createQuickCheckoutQuote(5_800);
    expect(quote.extraBlocks).toBe(0);
    expect(quote.totalPriceKrw).toBe(5_900);
    expect(quote.allowedCharacters).toBe(8_000);
  });

  it("adds one configurable block after the included boundary", () => {
    const quote = createQuickCheckoutQuote(8_001);
    expect(quote.extraBlocks).toBe(1);
    expect(quote.extraCharacters).toBe(7_000);
    expect(quote.totalPriceKrw).toBe(8_800);
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


describe("PRO·FINAL 초과분 과금", () => {
  it("포함 범위 안에서는 기본가만 받는다", () => {
    const quote = createProCheckoutQuote(PRO_INCLUDED_LIMIT_CHARS);
    expect(quote.extraBlocks).toBe(0);
    expect(quote.totalPriceKrw).toBe(PRO_BASE_PRICE_KRW);
    expect(quote.allowedCharacters).toBe(PRO_INCLUDED_LIMIT_CHARS);
  });

  it("한 글자만 넘어도 한 블록을 판다", () => {
    // Selling by the character would price a rounding error; selling by the
    // block is what QUICK already does.
    const quote = createProCheckoutQuote(PRO_INCLUDED_LIMIT_CHARS + 1);
    expect(quote.extraBlocks).toBe(1);
    expect(quote.extraPriceKrw).toBe(PRO_EXTRA_BLOCK_PRICE_KRW);
    expect(quote.allowedCharacters).toBe(PRO_INCLUDED_LIMIT_CHARS + PRO_EXTRA_BLOCK_CHARS);
  });

  it("허용 글자 수가 실제 분량을 덮는다", () => {
    // This is the whole point: the database compares allowed_characters against
    // the snapshot, and a quote that does not cover it takes the payment and
    // then fails the run with ACTIVE_ENTITLEMENT_NOT_FOUND.
    for (const total of [30_001, 35_000, 40_000, 55_555]) {
      expect(createProCheckoutQuote(total).allowedCharacters).toBeGreaterThanOrEqual(total);
      expect(createFinalCheckoutQuote(total).allowedCharacters).toBeGreaterThanOrEqual(total);
    }
  });

  it("이미 낸 단가보다 비싸지 않다", () => {
    // Someone who bought the tier and needs a little more room should not pay
    // above the rate they already paid.
    const included = PRO_BASE_PRICE_KRW / PRO_INCLUDED_LIMIT_CHARS;
    expect(PRO_EXTRA_BLOCK_PRICE_KRW / PRO_EXTRA_BLOCK_CHARS).toBeLessThan(included);
  });

  it("FINAL도 같은 블록을 쓴다", () => {
    const quote = createFinalCheckoutQuote(PRO_INCLUDED_LIMIT_CHARS + 12_000);
    expect(quote.extraBlocks).toBe(2);
    expect(quote.totalPriceKrw).toBe(FINAL_BASE_PRICE_KRW + PRO_EXTRA_BLOCK_PRICE_KRW * 2);
  });
});

describe("QUICK이 PRO보다 비싸지는 자리", () => {
  it("1블록은 아무 말도 하지 않는다", () => {
    // 8,800원. PRO보다 4,100원 쌉니다. 여기서 PRO를 권하면 안내가 아니라
    // 장사입니다.
    expect(quickCostsMoreThanPro(15_000)).toBe(false);
    expect(createQuickCheckoutQuote(15_000).totalPriceKrw).toBe(8_800);
  });

  it("2블록도 아무 말도 하지 않는다", () => {
    // 11,700원. 여전히 PRO보다 1,200원 쌉니다. 덜 받는 대신 덜 냅니다 —
    // 그것은 손해가 아니라 선택입니다.
    expect(createQuickCheckoutQuote(22_000).totalPriceKrw).toBe(11_700);
    expect(quickCostsMoreThanPro(22_000)).toBe(false);
  });

  it("3블록부터 PRO를 알려 준다", () => {
    // 14,600원. 여기서만 손님이 **더 내고 덜 받습니다.**
    const quick = createQuickCheckoutQuote(22_001).totalPriceKrw;
    expect(quick).toBe(14_600);
    expect(quick).toBeGreaterThan(PRO_BASE_PRICE_KRW);
    expect(quickCostsMoreThanPro(22_001)).toBe(true);
  });

  it("기준을 적어 두지 않고 두 값을 견준다", () => {
    // 언젠가 가격이 바뀌면 안내가 뜨는 자리도 따라 움직여야 합니다. 적어 둔
    // 숫자는 따라오지 않습니다. 그래서 경계마다 실제 견줌과 맞는지 봅니다.
    for (const characters of [0, 8_000, 8_001, 15_000, 15_001, 22_000, 22_001, 29_000, 50_000]) {
      expect(quickCostsMoreThanPro(characters)).toBe(
        createQuickCheckoutQuote(characters).totalPriceKrw > PRO_BASE_PRICE_KRW,
      );
    }
  });
});
