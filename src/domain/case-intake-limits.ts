/**
 * 사건자료를 얼마나 받아 줄 것인가 — 값과 안전장치.
 *
 * 이 파일이 막으려는 사고는 하나입니다. **18MB짜리 ZIP 하나가 풀리면 PDF 83개,
 * JPG 420장, 2,800쪽일 수 있습니다.** 압축 용량으로 판정하면 그 18MB를 보고
 * 분석을 시작하게 되고, 원가는 판매가를 넘습니다.
 *
 * 그래서 **압축을 푼 뒤 실제 분석량으로 판정합니다.** 순서가 곧 안전장치입니다.
 *
 * ```
 * 업로드 → 압축 해제 → 파일·쪽수 계산 → 플랜 확정 → 그때 비로소 OCR/모델 호출
 * ```
 *
 * 견적을 확정하기 전에는 돈이 나가는 일을 하나도 하지 않습니다.
 *
 * ## 판정은 AND입니다(= 하나라도 걸리면 초과)
 *
 * 쪽수·파일 수·해제 후 용량을 **모두** 만족해야 그 플랜입니다. 파일 50개에
 * 320쪽이면 초과이고, 파일 110개에 150쪽이어도 초과입니다.
 *
 * 다만 셋의 성격은 다릅니다. **쪽수가 값을 정하는 축**이고, 파일 수와 용량은
 * 비정상 업로드를 막는 울타리입니다 — 그래서 울타리는 화면에서 크게 말하지
 * 않고, 걸렸을 때만 이유를 밝힙니다.
 */

export type CasePlanTier = "BASIC" | "LARGE" | "XL";

export type CasePlan = {
  tier: CasePlanTier;
  label: string;
  /** 사건자료 분석 1건의 값. 서면 작성은 분량과 무관하게 정액입니다. */
  priceKrw: number;
  maxPages: number;
  maxFiles: number;
  maxUnzippedBytes: number;
};

const GB = 1024 * 1024 * 1024;

/**
 * 처음부터 관대하게 시작하지 않습니다.
 *
 * 기본을 300쪽으로 두는 이유는, 실제 평균 원가가 확인된 뒤에 300 → 500으로
 * 올리는 것은 쉽지만 반대는 어렵기 때문입니다. 이미 500쪽을 받아 온 서비스가
 * 어느 날 300쪽으로 줄이면 그건 값을 올린 것으로 읽힙니다.
 */
export const CASE_PLANS: readonly CasePlan[] = [
  { tier: "BASIC", label: "기본", priceKrw: 99_000, maxPages: 300, maxFiles: 100, maxUnzippedBytes: 1 * GB },
  { tier: "LARGE", label: "대용량", priceKrw: 149_000, maxPages: 700, maxFiles: 200, maxUnzippedBytes: 2 * GB },
  { tier: "XL", label: "초대용량", priceKrw: 199_000, maxPages: 1_500, maxFiles: 400, maxUnzippedBytes: 4 * GB },
];

export const BASIC_CASE_PLAN = CASE_PLANS[0];
export const LARGEST_CASE_PLAN = CASE_PLANS[CASE_PLANS.length - 1];

/**
 * 플랜과 무관하게 넘길 수 없는 값.
 *
 * 이쪽은 값의 문제가 아니라 서버가 버티느냐의 문제입니다. 압축 폭탄(작은
 * ZIP이 수십 GB로 풀리는 것)과 ZIP 안의 ZIP 재귀가 여기서 막힙니다.
 */
export const CASE_UPLOAD_HARD_LIMITS = {
  /** 한 번에 올리는 압축파일 자체의 크기. */
  zipUploadBytes: 200 * 1024 * 1024,
  /** ZIP 안의 ZIP은 한 단계까지만 풉니다. 그 아래는 열지 않습니다. */
  maxUnzipDepth: 1,
} as const;

/**
 * 글자를 쪽으로 바꾸는 기준.
 *
 * 이미지는 장당 1쪽입니다 — 사진 한 장을 읽는 데 드는 품이 글자 1,500자와
 * 크게 다르지 않고, 무엇보다 사람이 자기 자료를 셀 때 사진 한 장을 한 장으로
 * 셉니다.
 */
export const CHARS_PER_PAGE = 1_500;

export function estimatePagesFromChars(chars: number): number {
  return Math.ceil(Math.max(0, chars) / CHARS_PER_PAGE);
}

export type CaseVolume = {
  pages: number;
  files: number;
  /** 압축을 푼 뒤의 크기. 압축된 크기가 아닙니다. */
  unzippedBytes: number;
};

export type CaseLimitKind = "pages" | "files" | "bytes";

export type CaseLimitBreach = {
  kind: CaseLimitKind;
  label: string;
  value: number;
  allowed: number;
};

export type CasePlanDecision =
  /** 이 플랜 안에 들어옵니다. */
  | { fits: true; plan: CasePlan; breaches: readonly [] }
  /** 가장 큰 플랜으로도 안 됩니다. 어디가 걸렸는지 함께 돌려줍니다. */
  | { fits: false; plan: null; breaches: readonly CaseLimitBreach[] };

function breachesAgainst(volume: CaseVolume, plan: CasePlan): CaseLimitBreach[] {
  const breaches: CaseLimitBreach[] = [];
  if (volume.pages > plan.maxPages) breaches.push({ kind: "pages", label: "분석 페이지", value: volume.pages, allowed: plan.maxPages });
  if (volume.files > plan.maxFiles) breaches.push({ kind: "files", label: "파일 수", value: volume.files, allowed: plan.maxFiles });
  if (volume.unzippedBytes > plan.maxUnzippedBytes) breaches.push({ kind: "bytes", label: "압축 해제 후 용량", value: volume.unzippedBytes, allowed: plan.maxUnzippedBytes });
  return breaches;
}

export function fitsCasePlan(volume: CaseVolume, plan: CasePlan): boolean {
  return breachesAgainst(volume, plan).length === 0;
}

/**
 * 이 자료를 담을 수 있는 **가장 작은** 플랜.
 *
 * 큰 플랜부터 고르면 손님이 늘 비싼 값을 봅니다. 작은 것부터 훑어 처음
 * 들어맞는 것을 돌려줍니다.
 */
export function resolveCasePlan(volume: CaseVolume): CasePlanDecision {
  for (const plan of CASE_PLANS) {
    if (fitsCasePlan(volume, plan)) return { fits: true, plan, breaches: [] };
  }
  return { fits: false, plan: null, breaches: breachesAgainst(volume, LARGEST_CASE_PLAN) };
}

function formatBytesShort(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(bytes % GB === 0 ? 0 : 1)}GB`;
  return `${Math.ceil(bytes / (1024 * 1024))}MB`;
}

export function describeCaseLimitBreach(breach: CaseLimitBreach): string {
  if (breach.kind === "bytes") return `${breach.label} ${formatBytesShort(breach.value)}(최대 ${formatBytesShort(breach.allowed)})`;
  const unit = breach.kind === "pages" ? "페이지" : "개";
  return `${breach.label} ${breach.value.toLocaleString()}${unit}(최대 ${breach.allowed.toLocaleString()}${unit})`;
}

/**
 * 화면에 그대로 쓸 한 줄.
 *
 * 손님에게는 다섯 겹의 한도를 늘어놓지 않습니다 — 지금 자기 자료가 어느
 * 플랜인지, 넘었다면 무엇 때문인지만 알면 됩니다.
 */
export function describeCasePlanDecision(volume: CaseVolume, decision: CasePlanDecision): string {
  if (decision.fits) {
    return `총 ${volume.pages.toLocaleString()}페이지가 확인되었습니다. ${decision.plan.label} 분석(최대 ${decision.plan.maxPages.toLocaleString()}페이지) 범위입니다.`;
  }
  const reasons = decision.breaches.map(describeCaseLimitBreach).join(", ");
  return `총 ${volume.pages.toLocaleString()}페이지가 확인되었습니다. 가장 큰 플랜(${LARGEST_CASE_PLAN.maxPages.toLocaleString()}페이지)으로도 담기 어렵습니다 — ${reasons}. 이 규모는 따로 문의해 주세요.`;
}
