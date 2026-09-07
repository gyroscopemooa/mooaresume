import { describe, expect, it } from "vitest";
import {
  allowsWholeCorpus,
  checkCorpusFit,
  planAnalysisStage,
  REQUEST_INPUT_TOKEN_LIMIT,
  SAFE_REQUEST_INPUT_TOKENS,
  splitRequestCount,
  STAGE_TIER,
  summarizeStageUsage,
} from "./analysis-pipeline";

describe("단계별 모델 급", () => {
  it("전체를 훑는 단계는 가장 싼 급이다", () => {
    expect(STAGE_TIER.CLASSIFY).toBe("SCAN");
    expect(STAGE_TIER.INDEX).toBe("SCAN");
  });

  it("서면 작성만 가장 비싼 급을 쓴다", () => {
    expect(STAGE_TIER.DRAFT_DOCUMENT).toBe("FINAL");
    expect(STAGE_TIER.EXTRACT_ISSUES).toBe("REVIEW");
  });

  it("예산이 빠듯하면 한 급 내린다 — 거친 결과가 결과 없음보다 낫다", () => {
    const plan = planAnalysisStage("DRAFT_DOCUMENT", "DEGRADE");
    expect(plan.tier).toBe("REVIEW");
    expect(plan.demoted).toBe(true);
  });

  it("가장 싼 급은 더 내려갈 곳이 없다", () => {
    expect(planAnalysisStage("CLASSIFY", "DEGRADE").tier).toBe("SCAN");
  });

  it("예산이 넉넉하면 그대로 간다", () => {
    expect(planAnalysisStage("DRAFT_DOCUMENT", "OK").tier).toBe("FINAL");
  });
});

describe("전체 자료를 비싼 급에 넣지 못하게", () => {
  it("훑는 단계에는 전체를 넣어도 된다", () => {
    expect(allowsWholeCorpus("CLASSIFY")).toBe(true);
    expect(checkCorpusFit({ stage: "CLASSIFY", inputTokens: 100_000, wholeCorpus: true }).ok).toBe(true);
  });

  it("서면 작성 단계에 자료 전체를 넣으려 하면 막는다 — 이 서비스에서 가장 비싼 실수다", () => {
    const check = checkCorpusFit({ stage: "DRAFT_DOCUMENT", inputTokens: 150_000, wholeCorpus: true });
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.problem).toBe("WHOLE_CORPUS_TO_EXPENSIVE_TIER");
  });

  it("추려서 넣으면 서면 작성도 통과한다", () => {
    expect(checkCorpusFit({ stage: "DRAFT_DOCUMENT", inputTokens: 40_000, wholeCorpus: false }).ok).toBe(true);
  });
});

describe("요청이 길면 나눈다", () => {
  it("단가가 뛰는 선을 넘으면 막고 몇 번으로 나눌지 알려 준다", () => {
    const check = checkCorpusFit({ stage: "CLASSIFY", inputTokens: REQUEST_INPUT_TOKEN_LIMIT + 1, wholeCorpus: true });
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.problem).toBe("REQUEST_TOO_LONG");
      expect(check.requests).toBeGreaterThan(1);
    }
  });

  it("나누는 횟수는 안전선 기준이다", () => {
    expect(splitRequestCount(SAFE_REQUEST_INPUT_TOKENS)).toBe(1);
    expect(splitRequestCount(SAFE_REQUEST_INPUT_TOKENS + 1)).toBe(2);
    expect(splitRequestCount(0)).toBe(0);
  });

  it("1,400쪽 사건은 한 번에 못 넣는다 — 여러 번으로 나뉜다", () => {
    // 1,400쪽 ≈ 210만 자 ≈ 160만 토큰.
    expect(splitRequestCount(1_600_000)).toBeGreaterThan(5);
  });
});

describe("원가 기록", () => {
  it("급별로 나눠 더한다 — 어디에 돈이 갔는지 봐야 한다", () => {
    const summary = summarizeStageUsage([
      { stage: "CLASSIFY", tier: "SCAN", model: "scan", inputTokens: 1, outputTokens: 1, costKrw: 620 },
      { stage: "EXTRACT_ISSUES", tier: "REVIEW", model: "review", inputTokens: 1, outputTokens: 1, costKrw: 930 },
      { stage: "DRAFT_DOCUMENT", tier: "FINAL", model: "final", inputTokens: 1, outputTokens: 1, costKrw: 1_850 },
    ]);
    expect(summary.totalKrw).toBe(3_400);
    expect(summary.byTier.SCAN).toBe(620);
    expect(summary.byTier.FINAL).toBe(1_850);
  });

  it("하나라도 원가를 모르면 합계를 내지 않는다", () => {
    const summary = summarizeStageUsage([
      { stage: "CLASSIFY", tier: "SCAN", model: "scan", inputTokens: null, outputTokens: null, costKrw: null },
    ]);
    expect(summary.totalKrw).toBeNull();
  });
});
