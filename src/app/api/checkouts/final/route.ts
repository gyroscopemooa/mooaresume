import { handleCheckoutRequest } from "@/server/billing/checkout-route";

export const runtime = "nodejs";

// 상품은 이 주소가 아니라 분석 실행 기록에서 정해집니다. 세 등급이 같은 처리를
// 쓰고, 경로는 화면 쪽에서 어느 등급을 시작했는지 읽히도록 남겨 둡니다.
export const POST = handleCheckoutRequest;
