import { attemptCostKrw, type ModelPricing, type TokenUsage } from "./analysis-cost";

/**
 * 주문 하나가 쓸 수 있는 API 원가의 상한 — 차단기.
 *
 * 페이지 제한만으로는 부족합니다. 페이지 수를 지켜도 **버그 하나면** 원가가
 * 터집니다. 모델이 반복 호출되거나, 재시도가 꼬리를 물거나, 프롬프트가
 * 예상보다 몇 배로 부풀 수 있습니다. 그때 막아 줄 것이 페이지 수에는 없습니다.
 *
 * 그래서 주문마다 예산을 하나 들려 보냅니다. 호출하기 **전에** 예상 원가를
 * 재고, 예산을 넘길 것 같으면 그 호출을 하지 않습니다. 한 주문에 5만~10만원이
 * 나가는 사고는 이 한 겹에서 끝납니다.
 *
 * 값은 99,000원 상품 기준입니다. 판매가에서 부가세와 결제수수료를 빼면 약
 * 84,000원이 남고, 그중 8,000원까지를 API에 씁니다 — 최악의 경우에도 마진
 * 90%가 남는 자리입니다. 실제 평균은 이보다 훨씬 아래일 것으로 보고 있고,
 * 데이터가 쌓이면 이 숫자를 내리는 쪽으로 조정합니다.
 */
export const ORDER_API_BUDGET_KRW = 8_000;

/**
 * 이 선을 넘으면 비싼 길을 막습니다.
 *
 * 예산을 다 쓰고 멈추는 것보다, 남았을 때 **싼 경로로 갈아타는** 편이 낫습니다.
 * 결과가 아예 없는 것과 조금 거친 결과가 나오는 것은 손님에게 다른 일입니다.
 */
export const HIGH_COST_PATH_STOP_KRW = 7_000;

export type BudgetVerdict =
  /** 그대로 진행. */
  | "OK"
  /** 비싼 경로(고정밀 OCR·상위 모델)를 쓰지 않고 계속. */
  | "DEGRADE"
  /** 더 쓰면 안 됩니다. */
  | "STOP";

export type BudgetSnapshot = {
  budgetKrw: number;
  spentKrw: number;
  remainingKrw: number;
  verdict: BudgetVerdict;
};

export function budgetVerdict(spentKrw: number, budgetKrw = ORDER_API_BUDGET_KRW): BudgetVerdict {
  if (spentKrw >= budgetKrw) return "STOP";
  if (spentKrw >= HIGH_COST_PATH_STOP_KRW) return "DEGRADE";
  return "OK";
}

/**
 * 부르기 전에 재는 값.
 *
 * 출력 토큰은 아직 없으므로 **상한을 그대로 잡아 최악으로 계산합니다.** 낙관해서
 * 재면 차단기가 열려 있는 것과 같습니다 — 실제로 그만큼 나오는 순간 이미 늦습니다.
 */
export function estimateCallCostKrw(input: {
  inputTokens: number;
  maxOutputTokens: number;
  pricing: ModelPricing | null;
}): number | null {
  return attemptCostKrw({ inputTokens: input.inputTokens, outputTokens: input.maxOutputTokens }, input.pricing);
}

/** 글자 수로 토큰을 어림잡습니다. 한국어는 토큰이 글자보다 촘촘합니다. */
export const KOREAN_CHARS_PER_TOKEN = 1.3;

export function estimateTokensFromChars(chars: number): number {
  return Math.ceil(Math.max(0, chars) / KOREAN_CHARS_PER_TOKEN);
}

/**
 * 주문 하나의 예산을 들고 다니는 물건.
 *
 * 서버에서만 씁니다. 화면이 이 값을 들고 있으면 화면을 고쳐 예산을 늘릴 수
 * 있게 됩니다.
 */
export class OrderApiBudget {
  private spent = 0;

  constructor(private readonly budgetKrw: number = ORDER_API_BUDGET_KRW) {}

  snapshot(): BudgetSnapshot {
    return {
      budgetKrw: this.budgetKrw,
      spentKrw: this.spent,
      remainingKrw: Math.max(0, this.budgetKrw - this.spent),
      verdict: budgetVerdict(this.spent, this.budgetKrw),
    };
  }

  /**
   * 이 호출을 해도 되는지.
   *
   * 원가를 계산할 수 없으면(단가 미설정) 막지 않습니다. 단가를 안 넣었다는
   * 이유로 서비스가 멈추면, 차단기가 아니라 고장입니다. 대신 그 사실이
   * 로그에 남게 `pricingKnown: false`를 함께 돌려줍니다.
   */
  canSpend(estimateKrw: number | null): { allowed: boolean; pricingKnown: boolean; snapshot: BudgetSnapshot } {
    const snapshot = this.snapshot();
    if (estimateKrw === null) return { allowed: true, pricingKnown: false, snapshot };
    return { allowed: this.spent + estimateKrw <= this.budgetKrw, pricingKnown: true, snapshot };
  }

  /** 실제로 쓴 만큼 더합니다. 모르면 더하지 않습니다 — 0으로 두면 공짜였다는 뜻이 됩니다. */
  record(usage: TokenUsage, pricing: ModelPricing | null): number | null {
    const cost = attemptCostKrw(usage, pricing);
    if (cost !== null) this.spent += cost;
    return cost;
  }
}
