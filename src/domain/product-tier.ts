import { z } from "zod";
import type { WritingMode } from "./writing-mode";

export const productTierSchema = z.enum(["QUICK", "PRO", "FINAL"]);
export type ProductTier = z.infer<typeof productTierSchema>;

const tierEligibilitySchema = z.object({
  eligible: z.boolean(),
  reason: z.string().min(1).optional(),
});

export const productEligibilitySchema = z.object({
  quick: tierEligibilitySchema,
  pro: tierEligibilitySchema,
});
export type ProductEligibility = z.infer<typeof productEligibilitySchema>;

export function getProductEligibility(mode: WritingMode, draft: string): ProductEligibility {
  const hasDraft = draft.trim().length > 0;

  if (mode === "CREATE" || !hasDraft) {
    return {
      quick: { eligible: false, reason: "작성된 자기소개서가 없어 첨삭할 원문이 없습니다." },
      pro: { eligible: true },
    };
  }

  return {
    quick: { eligible: true },
    pro: { eligible: true },
  };
}
