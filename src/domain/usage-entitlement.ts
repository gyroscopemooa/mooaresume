import { z } from "zod";

export const QUICK_BASE_PRICE_KRW = 4_900;
export const QUICK_SOFT_LIMIT_CHARS = 7_000;
export const QUICK_INCLUDED_LIMIT_CHARS = 12_000;
export const QUICK_EXTRA_BLOCK_CHARS = 7_000;
export const QUICK_EXTRA_BLOCK_PRICE_KRW = 2_900;

export const checkoutQuoteSchema = z.object({
  productTier: z.literal("QUICK"),
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

export type QuickCheckoutMetadata = {
  applicationCaseId?: string;
  tier: "QUICK";
  totalCharacters: number;
  baseCharacters: number;
  includedCharacters: number;
  extraBlocks: number;
  allowedCharacters: number;
};

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

export function toQuickCheckoutMetadata(quote: CheckoutQuote, applicationCaseId?: string): QuickCheckoutMetadata {
  return {
    applicationCaseId,
    tier: "QUICK",
    totalCharacters: quote.totalCharacters,
    baseCharacters: quote.baseCharacters,
    includedCharacters: quote.includedCharacters,
    extraBlocks: quote.extraBlocks,
    allowedCharacters: quote.allowedCharacters,
  };
}

