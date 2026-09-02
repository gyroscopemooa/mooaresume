import { describe, expect, it } from "vitest";
import {
  attemptCostKrw,
  readModelPricingFromEnv,
  summarizeRunCost,
  type AttemptRecord,
  type ModelPricing,
} from "./analysis-cost";

const pricing: ModelPricing = { inputPerMillionUsd: 1, outputPerMillionUsd: 10, usdToKrw: 1_000 };

function attempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return { outcome: "COMPLETED", failureCode: null, inputTokens: 1_000, outputTokens: 1_000, ...overrides };
}

describe("attemptCostKrw", () => {
  it("입력과 출력에 각각 다른 단가를 적용한다", () => {
    // 1,000 입력 = $0.001, 1,000 출력 = $0.01 → $0.011 → 11원
    expect(attemptCostKrw({ inputTokens: 1_000, outputTokens: 1_000 }, pricing)).toBeCloseTo(11);
  });

  it("합계 토큰에 한 단가를 곱한 값과 다르다 — 출력이 훨씬 비싸기 때문", () => {
    const split = attemptCostKrw({ inputTokens: 9_000, outputTokens: 1_000 }, pricing);
    const flipped = attemptCostKrw({ inputTokens: 1_000, outputTokens: 9_000 }, pricing);
    expect(split).not.toBeCloseTo(flipped ?? 0);
  });

  it("단가가 없으면 금액을 만들어 내지 않는다", () => {
    expect(attemptCostKrw({ inputTokens: 1_000, outputTokens: 1_000 }, null)).toBeNull();
  });

  it("토큰을 전혀 모르면 0이 아니라 null이다", () => {
    // 0으로 두면 "공짜였다"가 되어 합계가 조용히 낮아집니다.
    expect(attemptCostKrw({ inputTokens: null, outputTokens: null }, pricing)).toBeNull();
  });
});

describe("summarizeRunCost", () => {
  it("실패한 시도의 요금도 합산한다", () => {
    const summary = summarizeRunCost({
      product: "QUICK",
      priceKrw: 4_900,
      pricing,
      attempts: [
        attempt({ outcome: "VALIDATION_FAILED", failureCode: "AI_OUTPUT_VALIDATION_FAILED" }),
        attempt(),
      ],
    });
    expect(summary.attempts).toBe(2);
    expect(summary.wastedAttempts).toBe(1);
    expect(summary.totalTokens).toBe(4_000);
    expect(summary.costKrw).toBeCloseTo(22);
  });

  it("원가가 판매가를 넘으면 LOSS", () => {
    const summary = summarizeRunCost({
      product: "QUICK",
      priceKrw: 4_900,
      pricing,
      attempts: [attempt({ outputTokens: 1_000_000 })],
    });
    expect(summary.costKrw).toBeGreaterThan(4_900);
    expect(summary.marginKrw).toBeLessThan(0);
    expect(summary.risk).toBe("LOSS");
  });

  it("마진이 절반 아래면 THIN", () => {
    // 출력 300,000 토큰 = $3 = 3,000원. 판매가 4,900원의 61%.
    const summary = summarizeRunCost({
      product: "QUICK",
      priceKrw: 4_900,
      pricing,
      attempts: [attempt({ inputTokens: 0, outputTokens: 300_000 })],
    });
    expect(summary.risk).toBe("THIN");
  });

  it("무료 건은 마진율로 판단하지 않는다 — 판매가가 0이라 항상 손해로 보인다", () => {
    const cheap = summarizeRunCost({ product: "QUICK", priceKrw: 0, pricing, attempts: [attempt()] });
    expect(cheap.marginRate).toBeNull();
    expect(cheap.risk).toBe("OK");
  });

  it("무료 건이라도 유료 판매가만큼 나갔으면 표시한다", () => {
    const heavy = summarizeRunCost({
      product: "QUICK",
      priceKrw: 0,
      pricing,
      attempts: [attempt({ outputTokens: 500_000 })],
    });
    expect(heavy.risk).toBe("FREE_HEAVY");
  });

  it("단가가 없으면 UNKNOWN이지만 토큰 합계는 그대로 준다", () => {
    const summary = summarizeRunCost({
      product: "QUICK",
      priceKrw: 4_900,
      pricing: null,
      attempts: [attempt(), attempt()],
    });
    expect(summary.risk).toBe("UNKNOWN");
    expect(summary.costKrw).toBeNull();
    expect(summary.totalTokens).toBe(4_000);
  });

  it("토큰을 모르는 시도가 섞여 있어도 아는 것만으로 합계를 낮추지 않는다", () => {
    const summary = summarizeRunCost({
      product: "QUICK",
      priceKrw: 4_900,
      pricing,
      attempts: [attempt({ inputTokens: null, outputTokens: null, outcome: "PROVIDER_FAILED" }), attempt()],
    });
    // 아는 시도 하나만 반영되고, 모르는 쪽이 0으로 둔갑하지 않습니다.
    expect(summary.totalTokens).toBe(2_000);
    expect(summary.attempts).toBe(2);
    expect(summary.wastedAttempts).toBe(1);
  });

  it("시도가 하나도 없으면 합계는 null", () => {
    const summary = summarizeRunCost({ product: "QUICK", priceKrw: 4_900, pricing, attempts: [] });
    expect(summary.totalTokens).toBeNull();
    expect(summary.costKrw).toBeNull();
  });
});

describe("readModelPricingFromEnv", () => {
  it("두 단가가 모두 있어야 읽는다", () => {
    expect(readModelPricingFromEnv({ OPENAI_PRICE_INPUT_PER_1M: "1.25" })).toBeNull();
    expect(readModelPricingFromEnv({ OPENAI_PRICE_OUTPUT_PER_1M: "10" })).toBeNull();
  });

  it("환율은 기본값이 있다", () => {
    const parsed = readModelPricingFromEnv({
      OPENAI_PRICE_INPUT_PER_1M: "1.25",
      OPENAI_PRICE_OUTPUT_PER_1M: "10",
    });
    expect(parsed).toEqual({ inputPerMillionUsd: 1.25, outputPerMillionUsd: 10, usdToKrw: 1_400 });
  });

  it("환율을 지정하면 그것을 쓴다", () => {
    const parsed = readModelPricingFromEnv({
      OPENAI_PRICE_INPUT_PER_1M: "1.25",
      OPENAI_PRICE_OUTPUT_PER_1M: "10",
      USD_KRW_RATE: "1380",
    });
    expect(parsed?.usdToKrw).toBe(1_380);
  });

  it("숫자가 아니면 무시한다", () => {
    expect(readModelPricingFromEnv({
      OPENAI_PRICE_INPUT_PER_1M: "무료",
      OPENAI_PRICE_OUTPUT_PER_1M: "10",
    })).toBeNull();
  });

  it("FINAL이 전용 모델을 안 쓰면 기본 단가를 그대로 쓴다", () => {
    const parsed = readModelPricingFromEnv({
      OPENAI_PRICE_INPUT_PER_1M: "2",
      OPENAI_PRICE_OUTPUT_PER_1M: "12",
    }, "FINAL");
    expect(parsed).toEqual({ inputPerMillionUsd: 2, outputPerMillionUsd: 12, usdToKrw: 1_400 });
  });

  it("FINAL이 전용 모델을 쓰는데 전용 단가가 없으면 기본 단가를 빌려 쓰지 않고 null", () => {
    expect(readModelPricingFromEnv({
      OPENAI_MODEL_FINAL: "gpt-5.6-sol",
      OPENAI_PRICE_INPUT_PER_1M: "2",
      OPENAI_PRICE_OUTPUT_PER_1M: "12",
    }, "FINAL")).toBeNull();
  });

  it("FINAL 전용 단가가 있으면 그것을 쓴다", () => {
    const parsed = readModelPricingFromEnv({
      OPENAI_MODEL_FINAL: "gpt-5.6-sol",
      OPENAI_PRICE_INPUT_PER_1M: "2",
      OPENAI_PRICE_OUTPUT_PER_1M: "12",
      OPENAI_PRICE_INPUT_PER_1M_FINAL: "4",
      OPENAI_PRICE_OUTPUT_PER_1M_FINAL: "18",
    }, "FINAL");
    expect(parsed).toEqual({ inputPerMillionUsd: 4, outputPerMillionUsd: 18, usdToKrw: 1_400 });
  });

  it("QUICK/PRO는 FINAL 전용 단가와 무관하다", () => {
    const parsed = readModelPricingFromEnv({
      OPENAI_MODEL_FINAL: "gpt-5.6-sol",
      OPENAI_PRICE_INPUT_PER_1M: "2",
      OPENAI_PRICE_OUTPUT_PER_1M: "12",
      OPENAI_PRICE_INPUT_PER_1M_FINAL: "4",
      OPENAI_PRICE_OUTPUT_PER_1M_FINAL: "18",
    }, "QUICK");
    expect(parsed).toEqual({ inputPerMillionUsd: 2, outputPerMillionUsd: 12, usdToKrw: 1_400 });
  });
});
