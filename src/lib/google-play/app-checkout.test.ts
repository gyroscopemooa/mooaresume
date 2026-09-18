import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GooglePlayPendingError,
  PENDING_PURCHASES_KEY,
  completeGooglePlayPurchase,
  readPendingPurchases,
  recoverGooglePlayPurchases,
  type DigitalGoodsServiceLike,
  type StorageLike,
  type VerifyResponse,
} from "./app-checkout";

const runId = "run-1";
const productId = "quick_1";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value); },
    removeItem: (key) => { map.delete(key); },
  };
}

function service(overrides: Partial<DigitalGoodsServiceLike> = {}): DigitalGoodsServiceLike {
  return {
    getDetails: vi.fn().mockResolvedValue([{ itemId: productId, price: { currency: "KRW", value: "5900" } }]),
    listPurchases: vi.fn().mockResolvedValue([]),
    consume: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const granted: VerifyResponse = { ok: true, code: null, message: "", consumable: true };

describe("in-app Google Play checkout", () => {
  let storage: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    storage = memoryStorage();
  });

  it("pays, verifies and only then consumes the purchase", async () => {
    const steps: string[] = [];
    const svc = service({ consume: vi.fn().mockImplementation(async () => { steps.push("consume"); }) });
    const requestPayment = vi.fn().mockImplementation(async () => { steps.push("pay"); return "token-1"; });
    const verify = vi.fn().mockImplementation(async () => { steps.push("verify"); return granted; });

    const result = await completeGooglePlayPurchase({ service: svc, productId, analysisRunId: runId, requestPayment, verify, storage });

    expect(result).toEqual({ purchaseToken: "token-1", reusedExistingPurchase: false });
    expect(steps).toEqual(["pay", "verify", "consume"]);
    expect(verify).toHaveBeenCalledWith({ analysisRunId: runId, purchaseToken: "token-1", productId });
    // 소비까지 끝났으면 미완료 기록은 남지 않습니다.
    expect(readPendingPurchases(storage)).toEqual([]);
  });

  it("keeps the purchase unconsumed and recorded when the server refuses it", async () => {
    const svc = service();
    const verify = vi.fn().mockResolvedValue({ ok: false, code: "CHECKOUT_CONTEXT_FAILED", message: "확인 실패", consumable: false });

    await expect(completeGooglePlayPurchase({
      service: svc, productId, analysisRunId: runId, requestPayment: vi.fn().mockResolvedValue("token-1"), verify, storage,
    })).rejects.toMatchObject({ code: "CHECKOUT_CONTEXT_FAILED" });

    expect(svc.consume).not.toHaveBeenCalled();
    expect(readPendingPurchases(storage)).toMatchObject([{ purchaseToken: "token-1", analysisRunId: runId, productId }]);
  });

  it("reports an awaiting-approval purchase as pending rather than a failure", async () => {
    const verify = vi.fn().mockResolvedValue({ ok: false, code: "GOOGLE_PLAY_PENDING", message: "승인 대기", consumable: false });
    const svc = service();

    await expect(completeGooglePlayPurchase({
      service: svc, productId, analysisRunId: runId, requestPayment: vi.fn().mockResolvedValue("token-1"), verify, storage,
    })).rejects.toBeInstanceOf(GooglePlayPendingError);
    expect(svc.consume).not.toHaveBeenCalled();
  });

  it("reuses an unfinished purchase instead of charging a second time", async () => {
    const svc = service({ listPurchases: vi.fn().mockResolvedValue([{ itemId: productId, purchaseToken: "token-old" }]) });
    const requestPayment = vi.fn();

    const result = await completeGooglePlayPurchase({
      service: svc, productId, analysisRunId: runId, requestPayment, verify: vi.fn().mockResolvedValue(granted), storage,
    });

    expect(requestPayment).not.toHaveBeenCalled();
    expect(result).toEqual({ purchaseToken: "token-old", reusedExistingPurchase: true });
  });

  it("clears a reused purchase that belongs to another case and pays for this one", async () => {
    const svc = service({ listPurchases: vi.fn().mockResolvedValue([{ itemId: productId, purchaseToken: "token-other" }]) });
    const verify = vi.fn()
      .mockResolvedValueOnce({ ok: false, code: "GOOGLE_PLAY_PURCHASE_ALREADY_APPLIED", message: "이미 적용", consumable: true })
      .mockResolvedValueOnce(granted);
    const requestPayment = vi.fn().mockResolvedValue("token-new");

    const result = await completeGooglePlayPurchase({ service: svc, productId, analysisRunId: runId, requestPayment, verify, storage });

    expect(svc.consume).toHaveBeenCalledWith("token-other");
    expect(requestPayment).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ purchaseToken: "token-new", reusedExistingPurchase: false });
    expect(readPendingPurchases(storage)).toEqual([]);
  });

  it("refuses to open a checkout priced in another currency", async () => {
    const svc = service({ getDetails: vi.fn().mockResolvedValue([{ itemId: productId, price: { currency: "USD", value: "4.99" } }]) });
    const requestPayment = vi.fn();

    await expect(completeGooglePlayPurchase({
      service: svc, productId, analysisRunId: runId, requestPayment, verify: vi.fn(), storage,
    })).rejects.toMatchObject({ code: "GOOGLE_PLAY_REGION_UNSUPPORTED" });
    expect(requestPayment).not.toHaveBeenCalled();
  });

  it("recovers an entitled purchase left behind by an interrupted verification", async () => {
    storage = memoryStorage({
      [PENDING_PURCHASES_KEY]: JSON.stringify([
        { purchaseToken: "token-1", productId, analysisRunId: runId, savedAt: new Date().toISOString() },
        { purchaseToken: "token-2", productId, analysisRunId: "run-2", savedAt: new Date().toISOString() },
        { purchaseToken: "token-3", productId, analysisRunId: "run-3", savedAt: new Date().toISOString() },
      ]),
    });
    const svc = service();
    const verify = vi.fn(async ({ purchaseToken }: { purchaseToken: string }) => {
      if (purchaseToken === "token-1") return granted;
      if (purchaseToken === "token-2") return { ok: false, code: "GOOGLE_PLAY_PENDING", message: "승인 대기", consumable: false };
      return { ok: false, code: "GOOGLE_PLAY_NOT_PURCHASED", message: "취소됨", consumable: false };
    });

    const outcome = await recoverGooglePlayPurchases({ service: svc, verify, storage });

    expect(outcome.entitled).toMatchObject([{ analysisRunId: runId }]);
    expect(outcome.pending).toMatchObject([{ analysisRunId: "run-2" }]);
    expect(svc.consume).toHaveBeenCalledTimes(1);
    // 대기 중인 건만 남습니다: 확인된 건은 소비했고, 취소된 건은 버립니다.
    expect(readPendingPurchases(storage)).toMatchObject([{ purchaseToken: "token-2" }]);
  });

  it("keeps a record when recovery cannot reach the server", async () => {
    storage = memoryStorage({
      [PENDING_PURCHASES_KEY]: JSON.stringify([{ purchaseToken: "token-1", productId, analysisRunId: runId, savedAt: new Date().toISOString() }]),
    });

    const outcome = await recoverGooglePlayPurchases({ service: service(), verify: vi.fn().mockRejectedValue(new Error("offline")), storage });

    expect(outcome).toEqual({ entitled: [], pending: [] });
    expect(readPendingPurchases(storage)).toHaveLength(1);
  });

  it("leaves another purchase kind for that screen to recover", async () => {
    // 미완료 목록은 하나인데 검증 라우트는 둘입니다(분석 / 모의면접 재시도).
    // 종류를 안 가리면 재시도 토큰이 분석 검증으로 가서 "상품 불일치"로
    // 거절당하고, 그 구매는 영영 정리되지 않습니다.
    storage = memoryStorage({
      [PENDING_PURCHASES_KEY]: JSON.stringify([
        { purchaseToken: "token-analysis", productId, analysisRunId: runId, savedAt: new Date().toISOString(), kind: "analysis" },
        { purchaseToken: "token-retry", productId: "interview_retry_1", analysisRunId: runId, savedAt: new Date().toISOString(), kind: "interviewRetry" },
      ]),
    });
    const verify = vi.fn().mockResolvedValue(granted);

    const outcome = await recoverGooglePlayPurchases({ service: service(), verify, storage, kind: "analysis" });

    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledWith(expect.objectContaining({ purchaseToken: "token-analysis" }));
    expect(outcome.entitled).toHaveLength(1);
    expect(readPendingPurchases(storage)).toMatchObject([{ purchaseToken: "token-retry" }]);
  });

  it("records the purchase kind so recovery can tell them apart", async () => {
    await completeGooglePlayPurchase({
      service: service({ consume: vi.fn().mockRejectedValue(new Error("later")) }),
      productId: "interview_retry_1",
      analysisRunId: runId,
      kind: "interviewRetry",
      requestPayment: vi.fn().mockResolvedValue("token-retry"),
      verify: vi.fn().mockResolvedValue(granted),
      storage,
    });
    // 소비가 실패해 기록이 남았고, 그 기록은 재시도 구매로 표시됩니다.
    expect(readPendingPurchases(storage)).toMatchObject([{ purchaseToken: "token-retry", kind: "interviewRetry" }]);
  });

  it("drops records older than the retention window", () => {
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    storage = memoryStorage({
      [PENDING_PURCHASES_KEY]: JSON.stringify([{ purchaseToken: "token-old", productId, analysisRunId: runId, savedAt: old }]),
    });
    expect(readPendingPurchases(storage)).toEqual([]);
  });
});
