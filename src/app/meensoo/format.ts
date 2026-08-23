/** Everything in the database is UTC; the operator reads Seoul time. */
export function kst(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function krw(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function shortId(id: string) {
  return id.slice(0, 8);
}

/**
 * Which bucket a purchase falls in, as a Pill status.
 *
 * Order matters: a sandbox order at 12,900원 is still not money, so the
 * environment is read before the amount.
 */
export function revenueKind(purchase: { environment: string; amount: number }) {
  if (purchase.environment === "sandbox") return "SANDBOX";
  if (purchase.environment === "unknown") return "UNMARKED";
  return purchase.amount > 0 ? "REAL" : "FREE";
}

export const STATUS_LABEL: Record<string, string> = {
  REAL: "실결제",
  FREE: "무료",
  SANDBOX: "샌드박스",
  UNMARKED: "구분 전",
  PENDING: "대기",
  RUNNING: "진행 중",
  COMPLETED: "완료",
  FAILED: "실패",
  PAID: "결제됨",
  REFUNDED: "환불됨",
  REVIEW_REQUIRED: "확인 필요",
  SENT: "발송",
  NEW: "새 문의",
  IN_PROGRESS: "처리 중",
  ANSWERED: "답변함",
  CLOSED: "종료",
};

export const MODE_LABEL: Record<string, string> = {
  CREATE: "처음부터 작성",
  BUILD: "내용 보완",
  POLISH: "최종 첨삭",
};
