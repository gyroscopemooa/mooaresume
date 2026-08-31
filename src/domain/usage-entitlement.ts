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
