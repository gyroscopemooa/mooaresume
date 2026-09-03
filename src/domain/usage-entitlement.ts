import { z } from "zod";

export const QUICK_BASE_PRICE_KRW = 5_900;
export const PRO_BASE_PRICE_KRW = 12_900;
export const PRO_INCLUDED_LIMIT_CHARS = 30_000;
/**
 * PRO·FINAL 초과분 과금.
 *
 * Without this, a letter over the included ceiling took the payment and then
 * failed inside the database with ACTIVE_ENTITLEMENT_NOT_FOUND — paid, and no
 * result, for a reason the screen could not explain. QUICK already sold extra
 * blocks; PRO simply had not been given the same door.
 *
 * 3,900원 per 10,000자 sits just under PRO's own included rate (12,900 / 30,000
 * = 0.43원 per character). Someone who has already bought the tier and needs a
 * little more room should not pay above the rate they already paid.
 */
export const PRO_EXTRA_BLOCK_CHARS = 10_000;
export const PRO_EXTRA_BLOCK_PRICE_KRW = 3_900;
// FINAL is PRO's scope plus its own verification pass, so it buys the same
// character budget at its own price. A separate limit would mean a customer who
// upgraded mid-application could suddenly fit less than they already had.
export const FINAL_BASE_PRICE_KRW = 19_900;
export const QUICK_SOFT_LIMIT_CHARS = 7_000;
// A Korean cover letter runs 4-7 questions of 500-1,000 characters, so the
// realistic ceiling is about 6,000 once the question headings are counted.
// 12,000 was double that — room nobody used, priced as if they might. 8,000
// keeps roughly 30% headroom over the longest real case. Raising a limit later
// is easy; lowering one after people rely on it is not, which is why this is
// set before launch rather than after.
export const QUICK_INCLUDED_LIMIT_CHARS = 8_000;
export const QUICK_EXTRA_BLOCK_CHARS = 7_000;
export const QUICK_EXTRA_BLOCK_PRICE_KRW = 2_900;
/**
 * QUICK이 팔 수 있는 마지막 길이.
 *
 * QUICK은 8,000자를 품고 7,000자마다 2,900원을 더 받습니다. 블록이 쌓이면
 * PRO 값에 다가가고, 결국 넘습니다:
 *
 *   1블록 · ~15,000자 → 8,800원  (PRO보다 4,100원 쌈)
 *   2블록 · ~22,000자 → 11,700원 (PRO보다 1,200원 쌈)
 *   3블록 · ~29,000자 → 14,600원 (**PRO보다 1,700원 비쌈**)
 *
 * 세 번째 줄은 손님이 더 내고 덜 받는 자리입니다. PRO는 12,900원에 공고 대조와
 * 경험 매칭까지 하고, 30,000자를 추가금 없이 품습니다. 그걸 알면 아무도 그
 * 선택을 하지 않습니다 — 모르니까 하는 것이고, 그건 팔 이유가 되지 못합니다.
 *
 * 그래서 1블록까지만 팝니다. 그 위는 PRO로 안내합니다. 상품 설명("작성한 글을
 * 빠르게 첨삭")과도 맞습니다 — 15,000자는 이미 지원서 한 벌이지 한 편이
 * 아닙니다.
 */
export const QUICK_MAX_EXTRA_BLOCKS = 1;
export const QUICK_MAX_CHARS = QUICK_INCLUDED_LIMIT_CHARS + QUICK_EXTRA_BLOCK_CHARS * QUICK_MAX_EXTRA_BLOCKS;
export const productTierSchema = z.enum(["QUICK", "PRO", "FINAL"]);
export type ProductTier = z.infer<typeof productTierSchema>;

export const checkoutQuoteSchema = z.object({
  productTier: productTierSchema,
  totalCharacters: z.number().int().nonnegative(),
  baseCharacters: z.number().int().positive(),
  includedCharacters: z.number().int().positive(),
  extraBlocks: z.number().int().nonnegative(),
  extraCharacters: z.number().int().nonnegative(),
  allowedCharacters: z.number().int().positive(),
  basePriceKrw: z.number().int().nonnegative(),
  extraPriceKrw: z.number().int().nonnegative(),
  totalPriceKrw: z.number().int().nonnegative(),
  needsScopeReview: z.boolean(),
});

export type CheckoutQuote = z.infer<typeof checkoutQuoteSchema>;

export type CheckoutMetadata = {
  applicationCaseId?: string;
  tier: ProductTier;
  totalCharacters: number;
  baseCharacters: number;
  includedCharacters: number;
  extraBlocks: number;
  allowedCharacters: number;
};

// Retained for established QUICK checkout call sites.
export type QuickCheckoutMetadata = CheckoutMetadata;

export function countNonWhitespaceCharacters(parts: readonly string[]): number {
  return parts.reduce((total, part) => total + part.replace(/\s/g, "").length, 0);
}

export function createQuickCheckoutQuote(totalCharacters: number): CheckoutQuote {
  const normalizedTotal = Math.max(0, Math.floor(totalCharacters));
  const overIncluded = Math.max(0, normalizedTotal - QUICK_INCLUDED_LIMIT_CHARS);
  const extraBlocks = Math.ceil(overIncluded / QUICK_EXTRA_BLOCK_CHARS);
  const extraCharacters = extraBlocks * QUICK_EXTRA_BLOCK_CHARS;
  const extraPriceKrw = extraBlocks * QUICK_EXTRA_BLOCK_PRICE_KRW;

  return checkoutQuoteSchema.parse({
    productTier: "QUICK",
    totalCharacters: normalizedTotal,
    baseCharacters: QUICK_SOFT_LIMIT_CHARS,
    includedCharacters: QUICK_INCLUDED_LIMIT_CHARS,
    extraBlocks,
    extraCharacters,
    allowedCharacters: QUICK_INCLUDED_LIMIT_CHARS + extraCharacters,
    basePriceKrw: QUICK_BASE_PRICE_KRW,
    extraPriceKrw,
    totalPriceKrw: QUICK_BASE_PRICE_KRW + extraPriceKrw,
    needsScopeReview: extraBlocks > 0,
  });
}

/**
 * 이 분량에 QUICK을 파는 것이 손님에게 손해인가.
 *
 * 막는 것이 목적이 아니라 **더 나은 쪽을 알려 주는 것**이 목적입니다. 무엇이
 * 더 싼지는 우리가 알고 손님은 모릅니다.
 */
export function exceedsQuickCeiling(totalCharacters: number): boolean {
  return Math.max(0, Math.floor(totalCharacters)) > QUICK_MAX_CHARS;
}


export function createProCheckoutQuote(totalCharacters: number): CheckoutQuote {
  const normalizedTotal = Math.max(0, Math.floor(totalCharacters));
  const overIncluded = Math.max(0, normalizedTotal - PRO_INCLUDED_LIMIT_CHARS);
  const extraBlocks = Math.ceil(overIncluded / PRO_EXTRA_BLOCK_CHARS);
  const extraCharacters = extraBlocks * PRO_EXTRA_BLOCK_CHARS;
  const extraPriceKrw = extraBlocks * PRO_EXTRA_BLOCK_PRICE_KRW;
  return checkoutQuoteSchema.parse({
    productTier: "PRO",
    totalCharacters: normalizedTotal,
    baseCharacters: PRO_INCLUDED_LIMIT_CHARS,
    includedCharacters: PRO_INCLUDED_LIMIT_CHARS,
    extraBlocks,
    extraCharacters,
    allowedCharacters: PRO_INCLUDED_LIMIT_CHARS + extraCharacters,
    basePriceKrw: PRO_BASE_PRICE_KRW,
    extraPriceKrw,
    totalPriceKrw: PRO_BASE_PRICE_KRW + extraPriceKrw,
    needsScopeReview: extraBlocks > 0,
  });
}
export function createFinalCheckoutQuote(totalCharacters: number): CheckoutQuote {
  const normalizedTotal = Math.max(0, Math.floor(totalCharacters));
  const overIncluded = Math.max(0, normalizedTotal - PRO_INCLUDED_LIMIT_CHARS);
  const extraBlocks = Math.ceil(overIncluded / PRO_EXTRA_BLOCK_CHARS);
  const extraCharacters = extraBlocks * PRO_EXTRA_BLOCK_CHARS;
  const extraPriceKrw = extraBlocks * PRO_EXTRA_BLOCK_PRICE_KRW;
  return checkoutQuoteSchema.parse({
    productTier: "FINAL",
    totalCharacters: normalizedTotal,
    baseCharacters: PRO_INCLUDED_LIMIT_CHARS,
    includedCharacters: PRO_INCLUDED_LIMIT_CHARS,
    extraBlocks,
    extraCharacters,
    allowedCharacters: PRO_INCLUDED_LIMIT_CHARS + extraCharacters,
    basePriceKrw: FINAL_BASE_PRICE_KRW,
    extraPriceKrw,
    totalPriceKrw: FINAL_BASE_PRICE_KRW + extraPriceKrw,
    needsScopeReview: extraBlocks > 0,
  });
}

export function createCheckoutQuote(product: ProductTier, totalCharacters: number): CheckoutQuote {
  if (product === "FINAL") return createFinalCheckoutQuote(totalCharacters);
  return product === "PRO"
    ? createProCheckoutQuote(totalCharacters)
    : createQuickCheckoutQuote(totalCharacters);
}

export function toCheckoutMetadata(quote: CheckoutQuote, applicationCaseId?: string): CheckoutMetadata {
  return {
    applicationCaseId,
    tier: quote.productTier,
    totalCharacters: quote.totalCharacters,
    baseCharacters: quote.baseCharacters,
    includedCharacters: quote.includedCharacters,
    extraBlocks: quote.extraBlocks,
    allowedCharacters: quote.allowedCharacters,
  };
}

export function toQuickCheckoutMetadata(quote: CheckoutQuote, applicationCaseId?: string): QuickCheckoutMetadata {
  return toCheckoutMetadata(quote, applicationCaseId);
}
