/**
 * 자료를 **읽는** 단계의 정책 — 어느 엔진에게 어느 쪽을 맡길 것인가.
 *
 * 분석(OpenAI)과 읽기(OCR)는 다른 일입니다. 이 파일은 읽기만 다룹니다.
 *
 * ## 지켜야 할 것 세 가지
 *
 * 1. **한 쪽은 한 엔진만 읽습니다.** Upstage와 OpenAI Vision에 같은 쪽을 둘 다
 *    보내면 값이 두 배가 되는데, 결과는 두 배로 좋아지지 않습니다. 그래서
 *    `planPageRead`는 언제나 엔진을 **하나만** 돌려줍니다.
 * 2. **공짜부터 씁니다.** 텍스트가 이미 들어 있는 PDF·DOCX는 서버가 그냥
 *    꺼내면 됩니다. 그 쪽을 OCR에 보내는 것은 돈을 버리는 일입니다.
 * 3. **비싼 길은 필요할 때만.** 기본은 OCR이고, 결과가 나쁘거나 표·양식이
 *    복잡할 때만 한 단계 올립니다. 가장 비싼 단계는 예산이 넉넉할 때만 엽니다.
 *
 * ## 왜 Upstage인가, 그리고 언제 버리는가
 *
 * 지금은 문서 OCR 전문 엔진이 범용 모델보다 한글 스캔·기울어진 사진·표에서
 * 낫고, 페이지당 고정가라 원가를 미리 셀 수 있습니다. 그 두 가지가 이유의
 * 전부입니다.
 *
 * 그러니 **둘 중 하나라도 무너지면 갈아탑니다.** OpenAI 쪽이 더 잘 읽게 되거나,
 * Upstage 품질이 떨어지거나, 값 차이가 사라지면 `READING_PROVIDER` 하나를
 * `OPENAI`로 바꾸면 됩니다 — 그때 이 파일 바깥은 고칠 것이 없습니다.
 * 키가 없으면 자동으로 OpenAI 경로로 내려갑니다(서비스가 멈추지 않습니다).
 */

import type { BudgetVerdict } from "./api-cost-budget";

/** 이 쪽이 무엇인지. 라우팅은 여기서 갈립니다. */
export type PageSourceKind =
  /** PDF·DOCX 안에 글자가 이미 있음. */
  | "TEXT_LAYER"
  /** 글자가 없는 스캔본·문서 사진. 읽어야 함. */
  | "SCANNED"
  /** 사진 자체가 증거(사고 현장·파손·상처). 글자가 아니라 내용을 봐야 함. */
  | "PHOTO_EVIDENCE";

export type ReadingEngine =
  | "NATIVE_TEXT"
  | "UPSTAGE_OCR"
  | "UPSTAGE_PARSE_STANDARD"
  | "UPSTAGE_PARSE_ENHANCED"
  | "OPENAI_VISION";

export const READING_ENGINE_LABEL: Record<ReadingEngine, string> = {
  NATIVE_TEXT: "자체 텍스트 추출",
  UPSTAGE_OCR: "Upstage OCR",
  UPSTAGE_PARSE_STANDARD: "Upstage Parse Standard",
  UPSTAGE_PARSE_ENHANCED: "Upstage Parse Enhanced",
  OPENAI_VISION: "OpenAI Vision",
};

/**
 * 페이지당 값(원). **환경변수로 받습니다.**
 *
 * 이 저장소가 이미 정한 규칙입니다(`analysis-cost.ts`) — 단가를 코드에 박지
 * 않습니다. 틀린 단가는 없는 것보다 나쁩니다. 화면에 숫자가 떠 있으면 맞는 줄
 * 알고 그 위에서 판단하게 됩니다. 값을 모르면 `null`이고, 그러면 원가를 세지
 * 않되 차단기가 서비스를 막지도 않습니다.
 */
export type ReadingPagePrices = Partial<Record<ReadingEngine, number>>;

export type ReadingProvider = "UPSTAGE" | "OPENAI";

export type ReadingPolicy = {
  provider: ReadingProvider;
  /** Upstage 키가 실제로 있는지. 없으면 provider가 UPSTAGE여도 OpenAI로 갑니다. */
  upstageAvailable: boolean;
  /** 가장 비싼 단계를 열어 둘지. 기본은 닫힘 — 자동 무제한 사용을 막습니다. */
  allowEnhanced: boolean;
  prices: ReadingPagePrices;
};

export type PageReadRequest = {
  kind: PageSourceKind;
  /** 표·양식이 많아 줄만 뽑아서는 뜻이 무너지는 쪽. */
  layoutComplex?: boolean;
};

export type PageReadPlan = {
  engine: ReadingEngine;
  /** 이 한 쪽을 읽는 데 드는 값. 단가를 모르면 null. */
  costKrw: number | null;
  reason: string;
};

function priceOf(policy: ReadingPolicy, engine: ReadingEngine): number | null {
  if (engine === "NATIVE_TEXT") return 0;
  const price = policy.prices[engine];
  return typeof price === "number" ? price : null;
}

/** Upstage를 쓸 수 있는 상태인가. 정책과 키가 **둘 다** 있어야 합니다. */
export function usesUpstage(policy: ReadingPolicy): boolean {
  return policy.provider === "UPSTAGE" && policy.upstageAvailable;
}

/**
 * 이 쪽을 처음 읽을 때 쓸 엔진. **하나만** 돌려줍니다.
 *
 * 사진 증거는 언제나 Vision입니다 — OCR은 "무엇이 찍혔는지"를 말해 주지
 * 못합니다. 반대로 문서 스캔은 언제나 OCR 쪽이 낫습니다. 이 갈림이 이 함수의
 * 전부이고, 나머지는 값과 가용성입니다.
 */
export function planPageRead(request: PageReadRequest, policy: ReadingPolicy): PageReadPlan {
  if (request.kind === "TEXT_LAYER") {
    return { engine: "NATIVE_TEXT", costKrw: 0, reason: "글자가 이미 들어 있어 서버가 그대로 꺼냅니다." };
  }

  if (request.kind === "PHOTO_EVIDENCE") {
    return {
      engine: "OPENAI_VISION",
      costKrw: priceOf(policy, "OPENAI_VISION"),
      reason: "사진 자체가 증거라 글자가 아니라 내용을 봐야 합니다.",
    };
  }

  if (!usesUpstage(policy)) {
    return {
      engine: "OPENAI_VISION",
      costKrw: priceOf(policy, "OPENAI_VISION"),
      reason: policy.provider === "OPENAI"
        ? "읽기 엔진이 OpenAI로 설정되어 있습니다."
        : "Upstage 키가 없어 OpenAI로 읽습니다.",
    };
  }

  // 표·양식이 복잡한 쪽은 줄만 뽑으면 뜻이 무너지므로 처음부터 구조를 읽습니다.
  // 한 번 OCR로 읽고 다시 Parse로 읽으면 두 번 값을 치릅니다.
  if (request.layoutComplex) {
    return {
      engine: "UPSTAGE_PARSE_STANDARD",
      costKrw: priceOf(policy, "UPSTAGE_PARSE_STANDARD"),
      reason: "표·양식이 있어 구조까지 읽습니다.",
    };
  }

  return { engine: "UPSTAGE_OCR", costKrw: priceOf(policy, "UPSTAGE_OCR"), reason: "스캔 문서를 글자로 옮깁니다." };
}

export type ReadQuality = {
  /** 0~1. 엔진이 돌려준 신뢰도이거나, 글자가 거의 안 나온 정도로 우리가 매긴 값. */
  confidence: number;
  /** 읽기 자체가 실패(예외·빈 응답)했는가. */
  failed: boolean;
};

/** 이 아래면 다시 읽습니다. 스캔 품질이 나쁘거나 손글씨가 섞인 쪽이 여기 걸립니다. */
export const RETRY_CONFIDENCE_THRESHOLD = 0.75;

export type EscalationDecision =
  | { escalate: true; plan: PageReadPlan; addedCostKrw: number | null }
  /** 더 올리지 않습니다 — 이미 최상위거나, 예산이 없거나, 품질이 충분합니다. */
  | { escalate: false; reason: string };

/**
 * 한 단계 올릴지 정합니다.
 *
 * **올리면 그 쪽은 값을 두 번 치릅니다.** 처음 읽기 값은 이미 나갔고 다시
 * 읽는 값이 더해집니다. 그래서 "품질이 나쁘다"만으로는 부족하고 예산이
 * 받쳐 줘야 올립니다 — 예산이 빠듯하면(`DEGRADE`) 거친 결과를 그대로 씁니다.
 * 결과가 조금 거친 것과 결과가 아예 없는 것은 손님에게 다른 일입니다.
 *
 * 가장 비싼 단계(Enhanced)는 정책이 명시적으로 열어 줄 때만 갑니다. 자동으로
 * 무제한 쓰이면 1,400쪽 사건 하나가 판매가를 넘깁니다.
 */
export function escalatePageRead(input: {
  current: ReadingEngine;
  quality: ReadQuality;
  policy: ReadingPolicy;
  budget: BudgetVerdict;
}): EscalationDecision {
  const { current, quality, policy, budget } = input;

  if (!quality.failed && quality.confidence >= RETRY_CONFIDENCE_THRESHOLD) {
    return { escalate: false, reason: "읽은 결과가 쓸 만합니다." };
  }
  if (budget === "STOP") return { escalate: false, reason: "이 주문의 API 예산을 다 썼습니다." };
  if (!usesUpstage(policy)) return { escalate: false, reason: "OpenAI 경로에는 올릴 단계가 없습니다." };

  if (current === "UPSTAGE_OCR") {
    if (budget === "DEGRADE") return { escalate: false, reason: "예산이 얼마 남지 않아 다시 읽지 않습니다." };
    return {
      escalate: true,
      plan: {
        engine: "UPSTAGE_PARSE_STANDARD",
        costKrw: priceOf(policy, "UPSTAGE_PARSE_STANDARD"),
        reason: "OCR 결과가 흐려 구조까지 다시 읽습니다.",
      },
      addedCostKrw: priceOf(policy, "UPSTAGE_PARSE_STANDARD"),
    };
  }

  if (current === "UPSTAGE_PARSE_STANDARD") {
    if (!policy.allowEnhanced) return { escalate: false, reason: "가장 비싼 단계는 기본으로 열지 않습니다." };
    if (budget !== "OK") return { escalate: false, reason: "예산이 넉넉할 때만 가장 비싼 단계를 씁니다." };
    return {
      escalate: true,
      plan: {
        engine: "UPSTAGE_PARSE_ENHANCED",
        costKrw: priceOf(policy, "UPSTAGE_PARSE_ENHANCED"),
        reason: "표·손글씨가 많아 최상위 단계로 읽습니다.",
      },
      addedCostKrw: priceOf(policy, "UPSTAGE_PARSE_ENHANCED"),
    };
  }

  return { escalate: false, reason: "더 올릴 단계가 없습니다." };
}

export type ReadingCostEstimate = {
  /** 엔진별 쪽수. 어디에 돈이 갔는지 관리자 화면이 그대로 읽습니다. */
  pagesByEngine: Partial<Record<ReadingEngine, number>>;
  totalPages: number;
  /** 단가를 하나라도 모르면 null — 아는 것만 더하면 원가가 낮아 보입니다. */
  totalKrw: number | null;
};

/** 견적. **모델을 부르기 전에** 이 값을 확정합니다. */
export function estimateReadingCost(requests: readonly PageReadRequest[], policy: ReadingPolicy): ReadingCostEstimate {
  const pagesByEngine: Partial<Record<ReadingEngine, number>> = {};
  let total = 0;
  let unknown = false;

  for (const request of requests) {
    const plan = planPageRead(request, policy);
    pagesByEngine[plan.engine] = (pagesByEngine[plan.engine] ?? 0) + 1;
    if (plan.costKrw === null) unknown = true;
    else total += plan.costKrw;
  }

  return { pagesByEngine, totalPages: requests.length, totalKrw: unknown ? null : total };
}
