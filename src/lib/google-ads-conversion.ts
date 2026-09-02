/**
 * 구글 광고에 "결제까지 갔다"를 알리는 한 번의 호출.
 *
 * 태그(`AW-18415179469`) 자체는 루트 레이아웃이 이미 싣고 있어서 방문은
 * 잡히고 있었습니다. 빠져 있던 것은 이 전환 이벤트뿐이고, 이것이 없으면
 * 구글은 어떤 광고가 매출을 냈는지 모른 채 입찰을 최적화하려 듭니다.
 *
 * `transaction_id`를 주문 번호로 채우는 이유: 결제 완료 화면은 새로고침되고,
 * 상태 확인도 몇 초마다 다시 돕니다. 같은 주문 번호로 온 전환은 구글이
 * 한 건으로 합치므로, 한 번 판 것이 열 번으로 세지지 않습니다.
 */
const CONVERSION_TARGET = "AW-18415179469/AHmECPaFguwcEM2thc1E";

type Gtag = (command: "event", action: string, params: Record<string, unknown>) => void;

/** 같은 창에서 이미 보고한 주문. 새로고침 너머는 구글의 중복 제거가 맡습니다. */
const reported = new Set<string>();

export function reportPurchaseConversion(input: {
  /** 주문 번호. 없으면 결제 식별자라도 넣어 주세요 — 중복 제거의 열쇠입니다. */
  transactionId: string;
  /** 실제로 받은 금액. 상품 정가가 아니라 초과 과금까지 더해진 값입니다. */
  value: number | null;
  currency: string | null;
}) {
  if (typeof window === "undefined") return;
  if (!input.transactionId || reported.has(input.transactionId)) return;

  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  // 광고 차단기나 동의 거부로 태그가 없을 수 있습니다. 그때 던지면 결제
  // 완료 화면이 통째로 깨집니다 — 보고를 못 하는 것이 훨씬 가벼운 일입니다.
  if (typeof gtag !== "function") return;

  reported.add(input.transactionId);
  gtag("event", "conversion", {
    send_to: CONVERSION_TARGET,
    // 값을 못 읽었으면 아예 보내지 않습니다. 0이나 1을 채워 넣으면 구글이
    // 그 숫자를 진짜 매출로 믿고 입찰을 그쪽으로 끌고 갑니다.
    ...(input.value && input.value > 0 ? { value: input.value, currency: input.currency ?? "KRW" } : {}),
    transaction_id: input.transactionId,
  });
}
