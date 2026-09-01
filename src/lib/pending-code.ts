/**
 * 로그인하러 다녀오는 동안 입력한 코드를 들고 있습니다.
 *
 * 추천코드와 쿠폰 코드는 로그인한 계정에만 적용됩니다. 그렇다고 입력칸을
 * 잠가 두면, 기관에서 쿠폰을 받아 온 사람은 결제 화면에서 "로그인하셔야
 * 합니다"만 읽고 멈춥니다 — 그 화면의 로그인 버튼은 요금 안내를 한참 지나야
 * 나옵니다. 그래서 칸은 열어 두고, 등록을 누르면 로그인으로 보냈다가
 * 돌아와서 대신 적용합니다.
 *
 * 저장은 `sessionStorage`입니다. 구글 로그인은 같은 탭에서 나갔다 돌아오므로
 * 값이 남고, 탭을 닫으면 함께 사라집니다 — 남의 컴퓨터에서 쓰던 코드가
 * 다음 사람에게 넘어가지 않습니다. 게스트 작성 내용이 결제 왕복을 건너는
 * 방식과 같습니다.
 */

export const PENDING_COUPON_CODE = "mooa:pending-coupon-code";
export const PENDING_REFERRAL_CODE = "mooa:pending-referral-code";

export function stashPendingCode(key: string, code: string): void {
  try {
    sessionStorage.setItem(key, code);
  } catch {
    // 저장소를 막아 둔 브라우저. 코드를 잃을 뿐 로그인은 그대로 진행됩니다.
  }
}

/**
 * 한 번만 꺼냅니다.
 *
 * 읽고 지우지 않으면 다음에 이 화면을 열 때마다 같은 코드를 다시 등록하려
 * 들고, 두 번째부터는 "이미 사용하신 쿠폰입니다"라는 오류가 뜹니다.
 */
export function takePendingCode(key: string): string | null {
  try {
    const value = sessionStorage.getItem(key);
    if (value) sessionStorage.removeItem(key);
    return value;
  } catch {
    return null;
  }
}
