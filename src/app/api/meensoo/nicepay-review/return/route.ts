import { nicepayReviewHtml } from "@/server/billing/nicepay-review";

export const runtime = "nodejs";

// Deliberately never reads/authenticates/approves callback data or grants access.
// The mobile return must also reject forged success and replay without cookies.
function blocked() {
  return nicepayReviewHtml('<!doctype html><html lang="ko"><meta charset="utf-8"><title>NICE 연결 확인</title><h1>연결 확인 전용 · 승인 처리 안 함</h1><p>인증 응답을 결제 성공으로 처리하거나 분석 이용권을 지급하지 않았습니다.</p><a href="/meensoo/payments/nicepay">관리자 검수로 돌아가기</a></html>', 409);
}
export const POST = blocked;
export const GET = blocked;
