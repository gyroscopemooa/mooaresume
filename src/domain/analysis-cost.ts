/**
 * 첨삭 한 건의 원가.
 *
 * ------------------------------------------------------------------
 * 왜 필요한가
 * ------------------------------------------------------------------
 * 지금까지 관리자 화면이 보여 준 토큰 수는 **성공한 시도 하나의 것**이었습니다.
 * `complete_quick_analysis`가 `analysis_runs`의 토큰 칸을 덮어쓰기 때문입니다.
 * 그런데 돈이 나가는 것은 성공한 시도만이 아닙니다 — 검증에서 걸려 버려진
 * 응답도 모델이 끝까지 만들어 낸 것이라 **요금은 그대로 나갔습니다.** 그
 * 금액이 어디에도 남지 않아, 실제로 한 건에 얼마가 들었는지 알 방법이
 * 없었습니다.
 *
 * 그래서 시도마다 한 줄씩 적어 두고(`analysis_run_attempts`), 그 줄들을 여기서
 * 합칩니다.
 *
 * ------------------------------------------------------------------
 * 단가를 코드에 박지 않는 이유
 * ------------------------------------------------------------------
 * 모델 단가는 바뀌고, 틀린 단가는 **없는 것보다 나쁩니다** — 화면에 숫자가
 * 떠 있으면 맞는 줄 알고 그 위에서 판단하게 됩니다. 그래서 환경변수로
 * 받고, 없으면 금액을 아예 계산하지 않습니다(`null`). 토큰 수는 그대로
 * 보여 주므로 화면이 비지는 않습니다.
 */

export type TokenUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
};

export type ModelPricing = {
  /** 100만 입력 토큰당 USD */
  inputPerMillionUsd: number;
  /** 100만 출력 토큰당 USD */
  outputPerMillionUsd: number;
  /** 1 USD당 원. 환율은 천천히 움직이므로 기본값을 둡니다. */
  usdToKrw: number;
};

/** 판매가. 마진은 이것과 원가의 차이입니다. */
export const PRODUCT_PRICE_KRW: Record<string, number> = {
  QUICK: 4_900,
  PRO: 9_900,
  FINAL: 14_900,
};

/**
 * 한 번의 API 호출 원가(원).
 *
 * 입력·출력 토큰을 **따로** 곱합니다. 합계 토큰에 한 단가를 곱하면 크게
 * 틀립니다 — 출력이 입력보다 몇 배 비싸고, 첨삭은 출력이 긴 작업이라
 * 그 차이가 그대로 오차가 됩니다.
 *
 * 토큰 수를 모르면 `null`입니다. 0으로 두면 "공짜였다"는 뜻이 되어
 * 합계가 조용히 낮아집니다.
 */
export function attemptCostKrw(usage: TokenUsage, pricing: ModelPricing | null): number | null {
  if (!pricing) return null;
  if (usage.inputTokens === null && usage.outputTokens === null) return null;
  const input = (usage.inputTokens ?? 0) / 1_000_000 * pricing.inputPerMillionUsd;
  const output = (usage.outputTokens ?? 0) / 1_000_000 * pricing.outputPerMillionUsd;
  return (input + output) * pricing.usdToKrw;
}

export type AttemptRecord = TokenUsage & {
  outcome: string;
  failureCode: string | null;
};

export type RunCostRisk = "OK" | "THIN" | "LOSS" | "FREE_HEAVY" | "UNKNOWN";

export type RunCostSummary = {
  attempts: number;
  /** 결과를 못 낸 시도. 이 횟수만큼 돈만 나갔습니다. */
  wastedAttempts: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  costKrw: number | null;
  priceKrw: number;
  marginKrw: number | null;
  /** 마진 ÷ 판매가. 무료 건은 판매가가 0이라 `null`입니다. */
  marginRate: number | null;
  risk: RunCostRisk;
};

/**
 * 마진이 이 아래로 내려가면 눈에 띄게 표시합니다.
 *
 * 카드 수수료와 메일 요금이 따로 빠지므로, 원가가 판매가의 절반을 넘어가면
 * 남는 것이 거의 없습니다. 손해가 난 뒤에 아는 것보다 그 전에 보이는 편이
 * 낫습니다.
 */
const THIN_MARGIN_RATE = 0.5;

/**
 * 무료 건이라도 이 금액을 넘으면 표시합니다.
 *
 * 무료 쿠폰은 원래 마케팅 비용이라 "손해"로 부를 일이 아닙니다. 다만 한
 * 건에 유료 판매가만큼 나갔다면 그건 쿠폰 정책이 아니라 사고입니다 —
 * 재시도가 반복됐거나 입력이 비정상적으로 길었다는 뜻입니다.
 */
const FREE_RUN_ALERT_KRW = PRODUCT_PRICE_KRW.QUICK;

/** 결과를 만들어 낸 시도. 나머지는 돈만 쓰고 버려진 것입니다. */
const PRODUCTIVE_OUTCOMES = new Set(["COMPLETED"]);

export function summarizeRunCost(input: {
  product: string;
  /** 무료 이용권으로 돌린 건이면 0. */
  priceKrw: number;
  attempts: readonly AttemptRecord[];
  pricing: ModelPricing | null;
}): RunCostSummary {
  const { attempts, pricing, priceKrw } = input;

  // 토큰을 하나도 모르면 합계도 모르는 것으로 둡니다. 아는 것만 더하면
  // "적게 썼다"로 읽혀 원가를 낮춰 보이게 만듭니다.
  const known = attempts.filter((attempt) => attempt.inputTokens !== null || attempt.outputTokens !== null);
  const sum = (pick: (attempt: AttemptRecord) => number | null) =>
    known.length === 0 ? null : known.reduce((total, attempt) => total + (pick(attempt) ?? 0), 0);

  const inputTokens = sum((attempt) => attempt.inputTokens);
  const outputTokens = sum((attempt) => attempt.outputTokens);
  const totalTokens = inputTokens === null && outputTokens === null ? null : (inputTokens ?? 0) + (outputTokens ?? 0);

  const costs = attempts.map((attempt) => attemptCostKrw(attempt, pricing));
  const costKrw = costs.every((cost) => cost === null) ? null : costs.reduce<number>((total, cost) => total + (cost ?? 0), 0);

  const marginKrw = costKrw === null ? null : priceKrw - costKrw;
  const marginRate = marginKrw === null || priceKrw === 0 ? null : marginKrw / priceKrw;

  return {
    attempts: attempts.length,
    wastedAttempts: attempts.filter((attempt) => !PRODUCTIVE_OUTCOMES.has(attempt.outcome)).length,
    inputTokens,
    outputTokens,
    totalTokens,
    costKrw,
    priceKrw,
    marginKrw,
    marginRate,
    risk: classifyRisk({ costKrw, priceKrw, marginRate }),
  };
}

function classifyRisk(input: { costKrw: number | null; priceKrw: number; marginRate: number | null }): RunCostRisk {
  if (input.costKrw === null) return "UNKNOWN";
  // 무료 건은 판매가가 0이라 마진율로는 아무것도 말할 수 없습니다. 금액 자체를 봅니다.
  if (input.priceKrw === 0) return input.costKrw >= FREE_RUN_ALERT_KRW ? "FREE_HEAVY" : "OK";
  if (input.costKrw > input.priceKrw) return "LOSS";
  return (input.marginRate ?? 1) < THIN_MARGIN_RATE ? "THIN" : "OK";
}

export const RISK_LABEL: Record<RunCostRisk, string> = {
  OK: "정상",
  THIN: "마진 얇음",
  LOSS: "원가 초과",
  FREE_HEAVY: "무료 과다",
  UNKNOWN: "단가 미설정",
};

/**
 * 환경변수에서 단가를 읽습니다.
 *
 * 둘 중 하나라도 없으면 `null`입니다 — 반쪽짜리 단가로 계산한 금액은
 * 틀린 금액이고, 틀린 금액은 화면에 없느니만 못합니다.
 */
export function readModelPricingFromEnv(
  env: Record<string, string | undefined> = process.env,
): ModelPricing | null {
  const input = Number(env.OPENAI_PRICE_INPUT_PER_1M);
  const output = Number(env.OPENAI_PRICE_OUTPUT_PER_1M);
  if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) return null;
  if (!env.OPENAI_PRICE_INPUT_PER_1M?.trim() || !env.OPENAI_PRICE_OUTPUT_PER_1M?.trim()) return null;

  const rate = Number(env.USD_KRW_RATE);
  return {
    inputPerMillionUsd: input,
    outputPerMillionUsd: output,
    usdToKrw: Number.isFinite(rate) && rate > 0 ? rate : 1_400,
  };
}
