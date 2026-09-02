// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { reportPurchaseConversion } from "./google-ads-conversion";

type Recorded = [string, string, Record<string, unknown>];

function withGtag() {
  const calls: Recorded[] = [];
  (window as unknown as { gtag: unknown }).gtag = (...args: Recorded) => { calls.push(args); };
  return calls;
}

afterEach(() => {
  delete (window as unknown as { gtag?: unknown }).gtag;
  vi.restoreAllMocks();
});

describe("reportPurchaseConversion", () => {
  it("결제 금액과 주문 번호를 실어 보낸다", () => {
    const calls = withGtag();
    reportPurchaseConversion({ transactionId: "order-amount", value: 12900, currency: "KRW" });

    expect(calls).toHaveLength(1);
    const [command, action, params] = calls[0];
    expect(command).toBe("event");
    expect(action).toBe("conversion");
    expect(params.send_to).toBe("AW-18415179469/AHmECPaFguwcEM2thc1E");
    expect(params.value).toBe(12900);
    expect(params.currency).toBe("KRW");
    expect(params.transaction_id).toBe("order-amount");
  });

  it("같은 주문은 두 번 보고하지 않는다", () => {
    // 결제 완료 화면은 몇 초마다 상태를 다시 확인합니다. 그때마다 보내면
    // 한 번 판 것이 수십 번 팔린 것으로 보고됩니다.
    const calls = withGtag();
    reportPurchaseConversion({ transactionId: "order-once", value: 8800, currency: "KRW" });
    reportPurchaseConversion({ transactionId: "order-once", value: 8800, currency: "KRW" });

    expect(calls).toHaveLength(1);
  });

  it("금액을 못 읽으면 값을 비운 채 보낸다", () => {
    // 0이나 1을 채워 넣으면 구글이 그 숫자를 진짜 매출로 믿습니다.
    const calls = withGtag();
    reportPurchaseConversion({ transactionId: "order-no-value", value: null, currency: null });

    expect(calls).toHaveLength(1);
    expect(calls[0][2]).not.toHaveProperty("value");
    expect(calls[0][2]).not.toHaveProperty("currency");
  });

  it("태그가 없으면 조용히 넘어간다", () => {
    // 광고 차단기를 쓰는 사람에게도 결제 완료 화면은 그대로 떠야 합니다.
    expect(() => reportPurchaseConversion({ transactionId: "order-no-tag", value: 8800, currency: "KRW" }))
      .not.toThrow();
  });
});
