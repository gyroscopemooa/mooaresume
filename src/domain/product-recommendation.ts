import type { ProductEligibility, ProductTier } from "./product-tier";
import type { WritingMode } from "./writing-mode";

export type ProductRecommendation = {
  recommendedTier: Exclude<ProductTier, "FINAL">;
  eligibility: ProductEligibility;
  message: string;
};

export function recommendProduct(
  mode: WritingMode,
  eligibility: ProductEligibility,
): ProductRecommendation {
  if (mode === "CREATE") {
    return {
      recommendedTier: "PRO",
      eligibility,
      message: "첨삭할 원문이 없어 경험과 소재부터 함께 찾는 PRO로 진행합니다.",
    };
  }

  if (mode === "POLISH") {
    return {
      recommendedTier: "QUICK",
      eligibility,
      message: "작성본이 거의 완성되어 빠른 최종 첨삭인 QUICK을 먼저 추천합니다.",
    };
  }

  return {
    recommendedTier: "PRO",
    eligibility,
    message: "내용과 근거가 부족한 초안은 공고와 지원자료를 함께 보는 PRO를 추천합니다.",
  };
}

export function getProductDestination(tier: Exclude<ProductTier, "FINAL">, mode: WritingMode) {
  if (tier === "QUICK") return "/quick";
  if (mode === "BUILD") return "/pro/build";
  if (mode === "POLISH") return "/pro/polish";
  return "/pro/create";
}
