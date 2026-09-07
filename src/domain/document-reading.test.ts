import { describe, expect, it } from "vitest";
import {
  escalatePageRead,
  estimateReadingCost,
  planPageRead,
  usesUpstage,
  type ReadingPolicy,
} from "./document-reading";
import { budgetVerdict, OrderApiBudget, ORDER_API_BUDGET_KRW, HIGH_COST_PATH_STOP_KRW } from "./api-cost-budget";

function policy(overrides: Partial<ReadingPolicy> = {}): ReadingPolicy {
  return {
    provider: "UPSTAGE",
    upstageAvailable: true,
    allowEnhanced: false,
    prices: { UPSTAGE_OCR: 2.2, UPSTAGE_PARSE_STANDARD: 14.8, UPSTAGE_PARSE_ENHANCED: 44.4, OPENAI_VISION: 4 },
    ...overrides,
  };
}

describe("한 쪽은 한 엔진만", () => {
  it("글자가 있는 쪽은 공짜로 꺼낸다 — OCR에 보내지 않는다", () => {
    const plan = planPageRead({ kind: "TEXT_LAYER" }, policy());
    expect(plan.engine).toBe("NATIVE_TEXT");
    expect(plan.costKrw).toBe(0);
  });

  it("스캔 문서는 OCR 하나만 탄다", () => {
    expect(planPageRead({ kind: "SCANNED" }, policy()).engine).toBe("UPSTAGE_OCR");
  });

  it("사진 증거는 OCR이 아니라 Vision — 글자가 아니라 내용을 봐야 한다", () => {
    expect(planPageRead({ kind: "PHOTO_EVIDENCE" }, policy()).engine).toBe("OPENAI_VISION");
  });

  it("표가 복잡한 쪽은 처음부터 구조를 읽는다 — OCR 후 다시 읽으면 두 번 낸다", () => {
    expect(planPageRead({ kind: "SCANNED", layoutComplex: true }, policy()).engine).toBe("UPSTAGE_PARSE_STANDARD");
  });
});

describe("Upstage를 못 쓰는 상황", () => {
  it("키가 없으면 OpenAI로 내려간다 — 서비스가 멈추지 않는다", () => {
    const fallback = policy({ upstageAvailable: false });
    expect(usesUpstage(fallback)).toBe(false);
    expect(planPageRead({ kind: "SCANNED" }, fallback).engine).toBe("OPENAI_VISION");
  });

  it("정책을 OpenAI로 바꾸면 그것만으로 갈아탄다", () => {
    expect(planPageRead({ kind: "SCANNED" }, policy({ provider: "OPENAI" })).engine).toBe("OPENAI_VISION");
  });
});

describe("품질이 나쁠 때만, 예산이 받쳐 줄 때만 올린다", () => {
  it("잘 읽혔으면 올리지 않는다", () => {
    const decision = escalatePageRead({ current: "UPSTAGE_OCR", quality: { confidence: 0.95, failed: false }, policy: policy(), budget: "OK" });
    expect(decision.escalate).toBe(false);
  });

  it("흐리게 읽혔고 예산이 넉넉하면 한 단계 올린다", () => {
    const decision = escalatePageRead({ current: "UPSTAGE_OCR", quality: { confidence: 0.4, failed: false }, policy: policy(), budget: "OK" });
    expect(decision.escalate).toBe(true);
    if (decision.escalate) expect(decision.plan.engine).toBe("UPSTAGE_PARSE_STANDARD");
  });

  it("예산이 빠듯하면 거친 결과를 그대로 쓴다 — 결과가 없는 것보다 낫다", () => {
    const decision = escalatePageRead({ current: "UPSTAGE_OCR", quality: { confidence: 0.2, failed: true }, policy: policy(), budget: "DEGRADE" });
    expect(decision.escalate).toBe(false);
  });

  it("예산을 다 쓰면 멈춘다", () => {
    const decision = escalatePageRead({ current: "UPSTAGE_OCR", quality: { confidence: 0, failed: true }, policy: policy(), budget: "STOP" });
    expect(decision.escalate).toBe(false);
  });

  it("가장 비싼 단계는 기본으로 열려 있지 않다", () => {
    const decision = escalatePageRead({ current: "UPSTAGE_PARSE_STANDARD", quality: { confidence: 0.1, failed: false }, policy: policy(), budget: "OK" });
    expect(decision.escalate).toBe(false);
  });

  it("명시적으로 열고 예산이 넉넉할 때만 최상위로 간다", () => {
    const decision = escalatePageRead({
      current: "UPSTAGE_PARSE_STANDARD",
      quality: { confidence: 0.1, failed: false },
      policy: policy({ allowEnhanced: true }),
      budget: "OK",
    });
    expect(decision.escalate).toBe(true);
    if (decision.escalate) expect(decision.plan.engine).toBe("UPSTAGE_PARSE_ENHANCED");
  });
});

describe("견적", () => {
  it("엔진별 쪽수를 나눠 세고 합계를 낸다", () => {
    const estimate = estimateReadingCost(
      [
        { kind: "TEXT_LAYER" }, { kind: "TEXT_LAYER" },
        { kind: "SCANNED" },
        { kind: "PHOTO_EVIDENCE" },
      ],
      policy(),
    );
    expect(estimate.totalPages).toBe(4);
    expect(estimate.pagesByEngine.NATIVE_TEXT).toBe(2);
    expect(estimate.pagesByEngine.UPSTAGE_OCR).toBe(1);
    expect(estimate.pagesByEngine.OPENAI_VISION).toBe(1);
    expect(estimate.totalKrw).toBeCloseTo(6.2, 5);
  });

  it("단가를 하나라도 모르면 합계를 내지 않는다 — 아는 것만 더하면 싸 보인다", () => {
    const estimate = estimateReadingCost([{ kind: "SCANNED" }], policy({ prices: {} }));
    expect(estimate.totalKrw).toBeNull();
  });

  it("800쪽이 텍스트고 500쪽만 스캔이면 읽기 값이 크게 줄어든다", () => {
    const requests = [
      ...Array.from({ length: 800 }, () => ({ kind: "TEXT_LAYER" as const })),
      ...Array.from({ length: 500 }, () => ({ kind: "SCANNED" as const })),
    ];
    const estimate = estimateReadingCost(requests, policy());
    expect(estimate.totalKrw).toBeCloseTo(1_100, 0);
  });
});

describe("주문 예산 차단기", () => {
  it("예산을 넘길 호출은 막는다", () => {
    const budget = new OrderApiBudget(1_000);
    expect(budget.canSpend(400).allowed).toBe(true);
    budget.record({ inputTokens: 1_000_000, outputTokens: 0 }, { inputPerMillionUsd: 1, outputPerMillionUsd: 1, usdToKrw: 900 });
    expect(budget.snapshot().spentKrw).toBeCloseTo(900, 5);
    expect(budget.canSpend(400).allowed).toBe(false);
  });

  it("단가를 모르면 막지 않되 그 사실을 알린다 — 차단기가 고장이 되면 안 된다", () => {
    const budget = new OrderApiBudget();
    const verdict = budget.canSpend(null);
    expect(verdict.allowed).toBe(true);
    expect(verdict.pricingKnown).toBe(false);
  });

  it("예산이 줄면 비싼 길부터 닫고, 다 쓰면 멈춘다", () => {
    expect(budgetVerdict(0)).toBe("OK");
    expect(budgetVerdict(HIGH_COST_PATH_STOP_KRW)).toBe("DEGRADE");
    expect(budgetVerdict(ORDER_API_BUDGET_KRW)).toBe("STOP");
  });
});
