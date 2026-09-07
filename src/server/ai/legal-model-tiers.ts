import "server-only";

import type { ModelTier } from "@/domain/analysis-pipeline";

/**
 * 급별 모델 이름을 환경변수에서 고릅니다.
 *
 * 모델 이름을 코드에 박지 않는 것은 이 저장소의 규칙입니다 — 모델은 바뀌고,
 * 역할(훑기·검토·작성)은 남습니다.
 *
 * 폴백이 층층이 있는 이유는 **설정을 덜 넣었다고 서비스가 멈추면 안 되기**
 * 때문입니다. 급별 값이 없으면 법률 기본 모델로, 그것도 없으면 사이트 기본
 * 모델로 내려갑니다. 셋 다 없을 때만 실패합니다.
 */
export type LegalModelTiers = Record<ModelTier, string>;

export function readLegalModelTiersFromEnv(): LegalModelTiers {
  const base = process.env.OPENAI_MODEL_LEGAL_BUILD?.trim() || process.env.OPENAI_MODEL?.trim();
  if (!base) throw new Error("OPENAI_MODEL 서버 환경변수가 필요합니다.");

  return {
    SCAN: process.env.OPENAI_MODEL_LEGAL_SCAN?.trim() || base,
    REVIEW: process.env.OPENAI_MODEL_LEGAL_REVIEW?.trim() || base,
    FINAL: process.env.OPENAI_MODEL_LEGAL_FINAL?.trim() || base,
  };
}

/**
 * 급별 단가.
 *
 * 급마다 모델이 다르면 단가도 달라서, 하나의 단가로 원가를 세면 크게 틀립니다.
 * 값을 안 넣은 급은 `null`이고, 그러면 그 호출의 원가를 세지 않습니다(0으로
 * 두면 공짜였다는 뜻이 됩니다).
 */
export type TierPricing = { inputPerMillionUsd: number; outputPerMillionUsd: number; usdToKrw: number };

function readNumber(name: string): number | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function readTierPricingFromEnv(tier: ModelTier): TierPricing | null {
  const usdToKrw = readNumber("USD_KRW_RATE") ?? 1_400;
  const input = readNumber(`OPENAI_PRICE_INPUT_PER_1M_LEGAL_${tier}`) ?? readNumber("OPENAI_PRICE_INPUT_PER_1M");
  const output = readNumber(`OPENAI_PRICE_OUTPUT_PER_1M_LEGAL_${tier}`) ?? readNumber("OPENAI_PRICE_OUTPUT_PER_1M");
  if (input === undefined || output === undefined) return null;
  return { inputPerMillionUsd: input, outputPerMillionUsd: output, usdToKrw };
}
