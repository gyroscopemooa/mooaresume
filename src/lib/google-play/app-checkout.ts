"use client";

/**
 * 앱(TWA) 안에서의 Google Play 구매 한 건을 끝까지 책임지는 흐름.
 *
 * 왜 `purchase.ts`만으로 부족했는가 — 세 가지가 빠져 있었습니다.
 *
 * 1. **소비(consume)를 하지 않았습니다.** Play의 소모성 상품은 소비해야 다시
 *    살 수 있습니다. 소비가 없으면 QUICK을 한 번 산 사람은 두 번째 지원서를
 *    영영 결제할 수 없습니다("이미 보유한 항목").
 * 2. **미완료 구매를 되살릴 방법이 없었습니다.** 결제는 됐는데 서버 검증 요청이
 *    끊기면, 돈은 나갔고 분석 권한은 없고 상품은 보유 상태로 남습니다.
 * 3. **결제 대기(pending)와 취소를 구분하지 않았습니다.**
 *
 * 순서가 중요합니다. **서버 검증이 이용권을 확인해 준 뒤에만 소비합니다.**
 * 먼저 소비하면 Play에서 그 구매의 흔적이 사라져, 검증에 실패했을 때 되살릴
 * 근거가 없어집니다.
 *
 * 토큰은 이 기기의 구매를 끝낼 수 있는 값이라 서버에 보내는 것 말고는
 * 아무 데도 남기지 않고, 브라우저 저장소에만(같은 기기) 미완료 목록으로 둡니다.
 */

export type DigitalGoodsItemDetails = { itemId: string; price: { currency: string; value: string } };

export type DigitalGoodsServiceLike = {
  getDetails(itemIds: string[]): Promise<DigitalGoodsItemDetails[]>;
  listPurchases?(): Promise<Array<{ itemId: string; purchaseToken: string }>>;
  consume?(purchaseToken: string): Promise<void>;
  /** Digital Goods API 1.0을 노출하는 기기용. 2.0의 consume과 같은 일을 합니다. */
  acknowledge?(purchaseToken: string, type: "onetime" | "repeatable"): Promise<void>;
};

/**
 * 무엇을 사려던 구매인지.
 *
 * 미완료 구매 목록은 하나인데 검증 라우트는 둘입니다(분석 사다리 /
 * 모의면접 재시도). 종류를 적어 두지 않으면, 복구가 재시도 구매 토큰을 분석
 * 검증에 보내 "상품 불일치"로 거절당하고 그 구매는 영영 정리되지 않습니다.
 */
export type PendingPurchaseKind = "analysis" | "interviewRetry";

export type PendingPurchaseRecord = {
  purchaseToken: string;
  productId: string;
  analysisRunId: string;
  savedAt: string;
  /** 없으면 분석 구매로 봅니다 — 이 항목이 생기기 전에 저장된 기록. */
  kind?: PendingPurchaseKind;
};

export type VerifyResponse = {
  ok: boolean;
  code: string | null;
  message: string;
  consumable: boolean;
};

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const PENDING_PURCHASES_KEY = "mooa:google-play-pending:v1";
const MAX_PENDING_RECORDS = 8;
const PENDING_RECORD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class GooglePlayCheckoutError extends Error {
  constructor(message: string, public readonly code: string, public readonly consumable = false) {
    super(message);
    this.name = "GooglePlayCheckoutError";
  }
}

/** 결제 승인 대기(무통장·편의점 등). 실패가 아니라 "아직"입니다. */
export class GooglePlayPendingError extends GooglePlayCheckoutError {
  constructor(message: string) {
    super(message, "GOOGLE_PLAY_PENDING");
    this.name = "GooglePlayPendingError";
  }
}

export function readPendingPurchases(storage: StorageLike | null, now = Date.now()): PendingPurchaseRecord[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(PENDING_PURCHASES_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is PendingPurchaseRecord =>
        Boolean(item) && typeof item === "object"
        && typeof (item as PendingPurchaseRecord).purchaseToken === "string"
        && typeof (item as PendingPurchaseRecord).productId === "string"
        && typeof (item as PendingPurchaseRecord).analysisRunId === "string"
        && typeof (item as PendingPurchaseRecord).savedAt === "string")
      // 오래된 기록은 버립니다. 남겨 두면 매번 서버에 물어보게 되고, 그만큼
      // 사라진 구매를 계속 되살리려 시도합니다.
      .filter((item) => now - new Date(item.savedAt).getTime() < PENDING_RECORD_TTL_MS)
      .slice(-MAX_PENDING_RECORDS);
  } catch {
    return [];
  }
}

function writePendingPurchases(storage: StorageLike | null, records: PendingPurchaseRecord[]) {
  if (!storage) return;
  try {
    if (records.length === 0) storage.removeItem(PENDING_PURCHASES_KEY);
    else storage.setItem(PENDING_PURCHASES_KEY, JSON.stringify(records.slice(-MAX_PENDING_RECORDS)));
  } catch {
    // 저장이 막힌 브라우저에서는 이번 구매만 이 화면에서 끝냅니다.
  }
}

export function rememberPendingPurchase(storage: StorageLike | null, record: PendingPurchaseRecord) {
  const rest = readPendingPurchases(storage).filter((item) => item.purchaseToken !== record.purchaseToken);
  writePendingPurchases(storage, [...rest, record]);
}

export function forgetPendingPurchase(storage: StorageLike | null, purchaseToken: string) {
  writePendingPurchases(storage, readPendingPurchases(storage).filter((item) => item.purchaseToken !== purchaseToken));
}

/** 이 기기에 남아 있는, 아직 소비되지 않은 같은 상품의 구매. */
async function findUnfinishedPurchase(input: {
  service: DigitalGoodsServiceLike;
  storage: StorageLike | null;
  productId: string;
  analysisRunId: string;
}): Promise<string | null> {
  const remembered = readPendingPurchases(input.storage).filter((item) => item.productId === input.productId);
  // 같은 지원 건의 기록이 먼저입니다 — 그 건에 쓰라고 산 구매입니다.
  const sameRun = remembered.find((item) => item.analysisRunId === input.analysisRunId);
  let owned: Array<{ itemId: string; purchaseToken: string }> | null = null;
  try {
    owned = input.service.listPurchases ? await input.service.listPurchases() : null;
  } catch {
    owned = null;
  }
  if (owned) {
    const tokens = new Set(owned.filter((item) => item.itemId === input.productId).map((item) => item.purchaseToken));
    if (sameRun && tokens.has(sameRun.purchaseToken)) return sameRun.purchaseToken;
    const otherRemembered = remembered.find((item) => tokens.has(item.purchaseToken));
    if (otherRemembered) return otherRemembered.purchaseToken;
    // 기록에 없는 보유 구매(앱 재설치·저장소 초기화 뒤). 새로 결제하려 해도
    // Play가 "이미 보유한 항목"으로 막으므로 이것을 씁니다.
    const [first] = [...tokens];
    return first ?? null;
  }
  return sameRun?.purchaseToken ?? null;
}

/**
 * `"consumed"` 소비 완료 · `"failed"` 이번에 실패(다음 실행에서 다시 시도) ·
 * `"unsupported"` 이 기기의 Digital Goods API에 소비 수단이 없음(다시 시도해도
 * 같으므로 기록을 붙들지 않습니다).
 */
async function consumePurchase(service: DigitalGoodsServiceLike, purchaseToken: string): Promise<"consumed" | "failed" | "unsupported"> {
  try {
    if (service.consume) await service.consume(purchaseToken);
    else if (service.acknowledge) await service.acknowledge(purchaseToken, "repeatable");
    else return "unsupported";
    return "consumed";
  } catch {
    // 이용권은 이미 지급됐습니다. 소비 실패는 다음 실행의 복구가 처리합니다.
    return "failed";
  }
}

/**
 * 구매 한 건: 보유 구매 재사용 또는 결제 → 서버 검증 → (통과했을 때만) 소비.
 *
 * 성공으로 돌아오면 서버가 이 지원 건의 이용권을 확인했다는 뜻입니다. 분석
 * 실행 자체는 부르는 쪽에서 기존 경로로 진행합니다.
 */
export async function completeGooglePlayPurchase(input: {
  service: DigitalGoodsServiceLike;
  productId: string;
  analysisRunId: string;
  requestPayment: (details: DigitalGoodsItemDetails) => Promise<string>;
  verify: (body: { analysisRunId: string; purchaseToken: string; productId: string }) => Promise<VerifyResponse>;
  storage: StorageLike | null;
  kind?: PendingPurchaseKind;
  now?: () => Date;
}): Promise<{ purchaseToken: string; reusedExistingPurchase: boolean }> {
  const now = input.now ?? (() => new Date());
  const kind = input.kind ?? "analysis";
  const [details] = await input.service.getDetails([input.productId]);
  if (!details) throw new GooglePlayCheckoutError("Play 상품 정보를 확인하지 못했습니다.", "GOOGLE_PLAY_PRODUCT_UNAVAILABLE");
  // 원장이 원화 기준입니다. 다른 통화로 청구될 결제는 열지 않습니다 — 결제
  // 창을 띄운 뒤 서버에서 거절하면 환불을 기다리게 됩니다.
  if (details.price.currency !== "KRW") {
    throw new GooglePlayCheckoutError(
      "현재 한국 Google Play 계정에서만 결제할 수 있습니다.",
      "GOOGLE_PLAY_REGION_UNSUPPORTED",
    );
  }

  let purchaseToken = await findUnfinishedPurchase({ service: input.service, storage: input.storage, productId: input.productId, analysisRunId: input.analysisRunId });
  let reusedExistingPurchase = Boolean(purchaseToken);
  if (!purchaseToken) purchaseToken = await input.requestPayment(details);
  rememberPendingPurchase(input.storage, { purchaseToken, productId: input.productId, analysisRunId: input.analysisRunId, savedAt: now().toISOString(), kind });

  let result = await input.verify({ analysisRunId: input.analysisRunId, purchaseToken, productId: input.productId });

  // 되살린 구매가 이미 다른 지원 건에 쓰인 것이었다면, 정리하고 이번 건을
  // 새로 결제합니다. 정리하지 않으면 Play가 계속 "이미 보유한 항목"으로 막아
  // 이 건은 영영 결제할 수 없습니다.
  if (!result.ok && reusedExistingPurchase && result.code === "GOOGLE_PLAY_PURCHASE_ALREADY_APPLIED") {
    if (result.consumable) await consumePurchase(input.service, purchaseToken);
    forgetPendingPurchase(input.storage, purchaseToken);
    purchaseToken = await input.requestPayment(details);
    reusedExistingPurchase = false;
    rememberPendingPurchase(input.storage, { purchaseToken, productId: input.productId, analysisRunId: input.analysisRunId, savedAt: now().toISOString(), kind });
    result = await input.verify({ analysisRunId: input.analysisRunId, purchaseToken, productId: input.productId });
  }

  if (result.consumable && await consumePurchase(input.service, purchaseToken) !== "failed") {
    forgetPendingPurchase(input.storage, purchaseToken);
  }

  if (!result.ok) {
    if (result.code === "GOOGLE_PLAY_PENDING") throw new GooglePlayPendingError(result.message);
    throw new GooglePlayCheckoutError(result.message, result.code ?? "GOOGLE_PLAY_VERIFY_FAILED", result.consumable);
  }

  return { purchaseToken, reusedExistingPurchase };
}

export type RecoveryOutcome = {
  /** 서버 검증을 통과해 이용권이 확인된 건들. 분석을 시작할 수 있습니다. */
  entitled: PendingPurchaseRecord[];
  /** 아직 결제 승인 대기 중인 건들. */
  pending: PendingPurchaseRecord[];
};

/**
 * 앱을 다시 열었을 때 남아 있는 미완료 구매를 정리합니다.
 *
 * 이 함수는 분석을 시작하지 않습니다 — 유료 호출을 화면 없이 대신 시작하지
 * 않기 위해서입니다. 확인된 건을 돌려주고, 시작 여부는 화면이 묻습니다.
 */
export async function recoverGooglePlayPurchases(input: {
  service: DigitalGoodsServiceLike;
  verify: (body: { analysisRunId: string; purchaseToken: string; productId: string }) => Promise<VerifyResponse>;
  storage: StorageLike | null;
  /** 이 종류의 구매만 확인합니다. 다른 종류는 그쪽 화면이 정리합니다. */
  kind?: PendingPurchaseKind;
}): Promise<RecoveryOutcome> {
  const kind = input.kind ?? "analysis";
  const outcome: RecoveryOutcome = { entitled: [], pending: [] };
  for (const record of readPendingPurchases(input.storage)) {
    if ((record.kind ?? "analysis") !== kind) continue;
    let result: VerifyResponse;
    try {
      result = await input.verify({ analysisRunId: record.analysisRunId, purchaseToken: record.purchaseToken, productId: record.productId });
    } catch {
      // 네트워크 문제로 확인하지 못한 건은 기록을 남겨 다음에 다시 봅니다.
      continue;
    }
    if (result.consumable && await consumePurchase(input.service, record.purchaseToken) !== "failed") {
      forgetPendingPurchase(input.storage, record.purchaseToken);
    }
    if (result.ok) outcome.entitled.push(record);
    else if (result.code === "GOOGLE_PLAY_PENDING") outcome.pending.push(record);
    else if (result.code === "GOOGLE_PLAY_NOT_PURCHASED") forgetPendingPurchase(input.storage, record.purchaseToken);
  }
  return outcome;
}
