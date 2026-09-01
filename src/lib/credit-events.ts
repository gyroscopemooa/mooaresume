/**
 * 이용권이 방금 생겼다고 같은 화면에 알립니다.
 *
 * 결제 직전 화면에는 두 가지가 함께 있습니다 — 쿠폰을 등록하는 칸과, 가진
 * 이용권을 찾아 "무료로 시작"을 내주는 부분. 그런데 이용권 조회는 화면이 뜰 때
 * 한 번만 돌기 때문에, **등록보다 조회가 먼저** 끝납니다. 그러면 이용권은
 * 실제로 만들어졌는데 화면은 없다고 믿은 채로 남고, 분석 시작을 누른 사람은
 * 가진 표를 두고 결제 화면을 봅니다.
 *
 * 두 컴포넌트는 서로를 모르고 부모도 공유하지 않으므로, 상태를 위로 올리는
 * 대신 창에 한 줄 알립니다. 관리자 콘솔의 테마 전환이 쓰는 방식과 같습니다.
 */

export const CREDIT_CHANGED_EVENT = "mooa:credit-changed";

export function announceCreditChange(): void {
  try {
    window.dispatchEvent(new Event(CREDIT_CHANGED_EVENT));
  } catch {
    // 서버 렌더처럼 창이 없는 자리. 알릴 상대도 없으므로 그냥 넘어갑니다.
  }
}

export function onCreditChange(handler: () => void): () => void {
  window.addEventListener(CREDIT_CHANGED_EVENT, handler);
  return () => window.removeEventListener(CREDIT_CHANGED_EVENT, handler);
}
