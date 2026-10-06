/**
 * `analysis_runs.response_id`는 OpenAI 응답 ID이면서 분석이 어느 단계인지도 겸해서 담는다(별도 DB 칸을 늘리지 않으려고).
 * 단계마다 문자열 모양이 달라서, 읽고 쓰는 방법을 한 곳에 모았다.
 *
 *   resp_W                                               작성 중(또는 작성 끝, 검토 시작 전)
 *   quality-v1|W|starting|<ts>                           첫 검토를 시작하는 중(다른 호출이 중복 구매하지 못하게 잡은 자리)
 *   quality-v1|W|R1                                      첫 검토 중
 *   quality-v1|W|R1|repair|starting|<ts>                 탈락 문항 재작성을 시작하는 중
 *   quality-v1|W|R1|repair|P|<startedAt>                 재작성 중(P = 재작성 응답)
 *   quality-v1|W|R1|repair|P|<startedAt>|review|starting|<ts>   두 번째 검토를 시작하는 중
 *   quality-v1|W|R1|repair|P|<startedAt>|review|R2       두 번째 검토 중
 *
 * 앞의 세 모양은 예전 그대로다. 뒤의 모양은 예전 코드가 읽어도 "첫 검토 중(R1)"으로 보여 첫 검토 결과로 끝나므로,
 * 배포 중 새 코드와 예전 코드가 같은 분석을 번갈아 만져도 분석이 멈추거나 이중으로 구매되지 않는다.
 */
export const QUALITY_CURSOR_TAG = "quality-v1";

export type QualityCursor =
  | { stage: "writer"; writerId: string }
  | { stage: "review-claim"; writerId: string; claimedAt: number }
  | { stage: "review"; writerId: string; reviewId: string }
  | { stage: "repair-claim"; writerId: string; reviewId: string; claimedAt: number }
  | { stage: "repair"; writerId: string; reviewId: string; repairId: string; startedAt: number }
  | { stage: "repair-review-claim"; writerId: string; reviewId: string; repairId: string; startedAt: number; claimedAt: number }
  | { stage: "repair-review"; writerId: string; reviewId: string; repairId: string; startedAt: number; repairReviewId: string };

export function parseQualityCursor(value: string): QualityCursor {
  const parts = value.split("|");
  if (parts[0] !== QUALITY_CURSOR_TAG) return { stage: "writer", writerId: value };
  const writerId = parts[1];
  if (parts[2] === "starting") return { stage: "review-claim", writerId, claimedAt: Number(parts[3]) };
  const reviewId = parts[2];
  if (parts[3] !== "repair") return { stage: "review", writerId, reviewId };
  if (parts[4] === "starting") return { stage: "repair-claim", writerId, reviewId, claimedAt: Number(parts[5]) };
  const repairId = parts[4];
  const startedAt = Number(parts[5]);
  if (parts[6] !== "review") return { stage: "repair", writerId, reviewId, repairId, startedAt };
  if (parts[7] === "starting") return { stage: "repair-review-claim", writerId, reviewId, repairId, startedAt, claimedAt: Number(parts[8]) };
  return { stage: "repair-review", writerId, reviewId, repairId, startedAt, repairReviewId: parts[7] };
}

export function formatQualityCursor(cursor: QualityCursor): string {
  switch (cursor.stage) {
    case "writer": return cursor.writerId;
    case "review-claim": return `${QUALITY_CURSOR_TAG}|${cursor.writerId}|starting|${cursor.claimedAt}`;
    case "review": return `${QUALITY_CURSOR_TAG}|${cursor.writerId}|${cursor.reviewId}`;
    case "repair-claim": return `${QUALITY_CURSOR_TAG}|${cursor.writerId}|${cursor.reviewId}|repair|starting|${cursor.claimedAt}`;
    case "repair": return `${QUALITY_CURSOR_TAG}|${cursor.writerId}|${cursor.reviewId}|repair|${cursor.repairId}|${cursor.startedAt}`;
    case "repair-review-claim": return `${QUALITY_CURSOR_TAG}|${cursor.writerId}|${cursor.reviewId}|repair|${cursor.repairId}|${cursor.startedAt}|review|starting|${cursor.claimedAt}`;
    case "repair-review": return `${QUALITY_CURSOR_TAG}|${cursor.writerId}|${cursor.reviewId}|repair|${cursor.repairId}|${cursor.startedAt}|review|${cursor.repairReviewId}`;
  }
}
