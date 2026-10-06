import Link from "next/link";
import styles from "./similar-earlier-notice.module.css";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** "10월 4일"(올해) 또는 "2025년 12월 30일"(다른 해). 한국 시간 기준이고, 서버·브라우저 로캘에 따라 달라지지 않게 직접 계산한다. */
export function formatEarlierDate(analyzedAt: string, now: Date = new Date()): string | null {
  const at = Date.parse(analyzedAt);
  if (!Number.isFinite(at)) return null;
  const date = new Date(at + KST_OFFSET_MS);
  const today = new Date(now.getTime() + KST_OFFSET_MS);
  const monthDay = `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
  return date.getUTCFullYear() === today.getUTCFullYear() ? monthDay : `${date.getUTCFullYear()}년 ${monthDay}`;
}

/**
 * 결과 맨 위의 안내 한 줄: 같은 계정에서 전에 첨삭한 비슷한 글이 있을 때만 붙는다(판정은 `findSimilarEarlierAnalysis`).
 *
 * 말하는 것은 두 가지뿐이다 — 전에 비슷한 글이 있었다는 사실, 그리고 같은 글도 AI 첨삭은 표현과 일부 판단이
 * 조금 달라질 수 있다는 한계. 전에 쓴 결과를 기준점으로 삼았다거나 이어받았다는 말은 하지 않는다: 글자까지
 * 똑같은 입력이 아니면 이전 결과를 기준으로 쓰지 않기 때문이다.
 */
export function SimilarEarlierNotice({ analysisRunId, analyzedAt, now }: { analysisRunId: string; analyzedAt: string; now?: Date }) {
  const when = formatEarlierDate(analyzedAt, now);
  return (
    <aside className={styles.notice} role="note" aria-label="비슷한 글 안내">
      <p>
        <b>같은 계정에서 전에 첨삭한 비슷한 글이 있어요.</b> 같은 글도 AI 첨삭은 표현과 일부 판단이 조금 달라질 수 있어요.
      </p>
      <Link href={`/result?analysisRunId=${encodeURIComponent(analysisRunId)}`}>{when ? `${when}에 첨삭한 결과 보기` : "전에 첨삭한 결과 보기"}</Link>
    </aside>
  );
}
