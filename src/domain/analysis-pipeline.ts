import type { BudgetVerdict } from "./api-cost-budget";

/**
 * 분석 매커니즘 — 어느 단계에 어느 급의 모델을 쓸 것인가.
 *
 * 읽기(`document-reading.ts`)가 끝나면 텍스트가 남습니다. 그다음이 이 파일입니다.
 *
 * ## 한 문장으로
 *
 * **싼 모델로 전부 훑고, 비싼 모델은 추려진 몇 쪽에만 씁니다.**
 *
 * ```
 * 전체 자료 ──▶ SCAN   분류·색인·요약          (가장 싼 급)
 *                │
 *                ▼ 추려진 부분만
 *              REVIEW  쟁점 추출·중요 쪽 재검토  (중간 급)
 *                │
 *                ▼ 정리된 근거만
 *              FINAL   법률 논리·서면 작성      (가장 비싼 급)
 * ```
 *
 * ## 절대 하면 안 되는 것
 *
 * **전체 자료를 FINAL 급에 그대로 넣는 것.** 300쪽을 매번 최상위 모델에 밀어
 * 넣으면 한 건이 판매가를 넘습니다. 이 파일은 그 실수를 타입과 함수로 막습니다
 * (`planAnalysisStage`는 FINAL 단계에 전체 자료 크기를 허용하지 않습니다).
 *
 * ## 요청 하나가 너무 길면 단가가 뛴다
 *
 * 입력이 일정 선을 넘으면 그 요청 **전체**의 단가가 올라가는 모델이 있습니다.
 * 그래서 "한 번에 다 넣기"는 편한 만큼 비쌉니다. 선 아래로 잘라 나눠 부르고,
 * 필요한 근거만 다시 모으는 편이 쌉니다 — `splitRequestCount`가 그 계산입니다.
 *
 * 모델 이름은 여기 없습니다. 이 저장소 규칙대로 환경변수로 받습니다
 * (`server/ai/legal-model-tiers.ts`).
 */

/** 파이프라인의 단계. 순서가 곧 비용 순서입니다. */
export type AnalysisStage =
  /** 이 자료가 무엇인지 가르고 색인합니다. 전체를 훑는 유일한 단계. */
  | "CLASSIFY"
  /** 사건 타임라인·쪽번호 색인을 세웁니다. */
  | "INDEX"
  /** 쟁점을 뽑습니다. 추려진 부분만 봅니다. */
  | "EXTRACT_ISSUES"
  /** 쟁점에 걸린 쪽만 자세히 다시 읽습니다. */
  | "REVIEW_PAGES"
  /** 서면을 씁니다. 정리된 근거만 들어갑니다. */
  | "DRAFT_DOCUMENT";

/** 모델의 급. 벤더 이름이 아니라 역할로 부릅니다 — 모델은 바뀌고 역할은 남습니다. */
export type ModelTier = "SCAN" | "REVIEW" | "FINAL";

export const STAGE_TIER: Record<AnalysisStage, ModelTier> = {
  CLASSIFY: "SCAN",
  INDEX: "SCAN",
  EXTRACT_ISSUES: "REVIEW",
  REVIEW_PAGES: "REVIEW",
  DRAFT_DOCUMENT: "FINAL",
};

/** 전체 자료를 통째로 넣어도 되는 단계. 나머지는 추려서 넣어야 합니다. */
const WHOLE_CORPUS_STAGES: ReadonlySet<AnalysisStage> = new Set<AnalysisStage>(["CLASSIFY", "INDEX"]);

export function allowsWholeCorpus(stage: AnalysisStage): boolean {
  return WHOLE_CORPUS_STAGES.has(stage);
}

/**
 * 요청 하나에 넣는 입력 토큰의 실무 상한.
 *
 * 모델이 받아 주는 최대치가 아니라 **단가가 뛰지 않는 선**입니다. 받아 준다는
 * 것과 싸다는 것은 다릅니다.
 */
export const REQUEST_INPUT_TOKEN_LIMIT = 272_000;

/** 실제로 쓰는 값. 상한에 딱 붙이면 지시문·출력 여유가 없습니다. */
export const SAFE_REQUEST_INPUT_TOKENS = 200_000;

/** 이만큼이면 몇 번에 나눠 불러야 하는지. */
export function splitRequestCount(inputTokens: number, perRequest = SAFE_REQUEST_INPUT_TOKENS): number {
  if (inputTokens <= 0) return 0;
  return Math.ceil(inputTokens / perRequest);
}

export type StagePlan = {
  stage: AnalysisStage;
  tier: ModelTier;
  /** 예산 때문에 급을 내렸는가. */
  demoted: boolean;
  reason: string;
};

const LOWER_TIER: Record<ModelTier, ModelTier> = { FINAL: "REVIEW", REVIEW: "SCAN", SCAN: "SCAN" };

/**
 * 이 단계를 어느 급으로 돌릴지.
 *
 * 예산이 빠듯하면 한 급 내립니다. 결과가 조금 거친 것과 결과가 아예 없는 것은
 * 손님에게 다른 일입니다 — 다만 예산을 다 썼으면 내리는 것으로도 안 되므로
 * 부르는 쪽이 멈춰야 합니다(`budget === "STOP"`).
 */
export function planAnalysisStage(stage: AnalysisStage, budget: BudgetVerdict): StagePlan {
  const base = STAGE_TIER[stage];
  if (budget === "DEGRADE" && base !== "SCAN") {
    return { stage, tier: LOWER_TIER[base], demoted: true, reason: "예산이 얼마 남지 않아 한 급 낮춰 돌립니다." };
  }
  return { stage, tier: base, demoted: false, reason: "기본 급으로 돌립니다." };
}

export type CorpusFitProblem = "WHOLE_CORPUS_TO_EXPENSIVE_TIER" | "REQUEST_TOO_LONG";

export type CorpusFitCheck =
  | { ok: true; requests: number }
  | { ok: false; problem: CorpusFitProblem; requests: number; message: string };

/**
 * 이 단계에 이만큼을 넣어도 되는지.
 *
 * 두 가지를 봅니다.
 *
 * 1. **비싼 급에 전체 자료를 넣으려는가.** 서면 작성 단계에 300쪽을 그대로
 *    밀어 넣는 것이 이 서비스에서 가장 비싼 실수입니다. 추려서 넣어야 합니다.
 * 2. **한 요청이 너무 긴가.** 길면 나눠야 하고, 나눌 수 없는 자리면 막습니다.
 */
export function checkCorpusFit(input: {
  stage: AnalysisStage;
  inputTokens: number;
  /** 전체 자료를 그대로 넣으려는 호출인가. */
  wholeCorpus: boolean;
}): CorpusFitCheck {
  const requests = splitRequestCount(input.inputTokens);

  if (input.wholeCorpus && !allowsWholeCorpus(input.stage)) {
    return {
      ok: false,
      problem: "WHOLE_CORPUS_TO_EXPENSIVE_TIER",
      requests,
      message: `${input.stage} 단계에는 자료 전체를 넣지 않습니다. 앞 단계에서 추려진 근거만 보내세요.`,
    };
  }

  if (input.inputTokens > REQUEST_INPUT_TOKEN_LIMIT) {
    return {
      ok: false,
      problem: "REQUEST_TOO_LONG",
      requests,
      message: `한 요청에 ${input.inputTokens.toLocaleString()}토큰은 너무 깁니다. ${requests}번으로 나눠 부르세요.`,
    };
  }

  return { ok: true, requests };
}

/** 관리자 화면에 남길 한 줄. 어디에 돈이 갔는지 이 값으로 봅니다. */
export type StageUsageRecord = {
  stage: AnalysisStage;
  tier: ModelTier;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costKrw: number | null;
};

export function summarizeStageUsage(records: readonly StageUsageRecord[]): {
  byTier: Partial<Record<ModelTier, number>>;
  totalKrw: number | null;
} {
  const byTier: Partial<Record<ModelTier, number>> = {};
  let total = 0;
  let unknown = false;

  for (const record of records) {
    if (record.costKrw === null) unknown = true;
    else {
      total += record.costKrw;
      byTier[record.tier] = (byTier[record.tier] ?? 0) + record.costKrw;
    }
  }

  return { byTier, totalKrw: unknown ? null : total };
}
