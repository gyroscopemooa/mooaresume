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

export const STATUS_LABEL: Record<string, string> = {
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
