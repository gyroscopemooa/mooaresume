"use client";

import { useState } from "react";
import { Check, Clipboard } from "lucide-react";
import type { ResultRecommendation } from "@/domain/result-document";
import styles from "./recommendation-list.module.css";

/**
 * 원문은 그대로 두고 옆에 붙는 "다른 시각 추천안".
 *
 * '개선안'이라고 부르지 않는다: 원문보다 낫다는 약속을 할 수 없고, 지원자의
 * 문체를 지키는 것이 이 서비스의 차별점이다. 고를지 말지는 지원자가 정한다.
 */
export function RecommendationList({ items, kept }: { items?: readonly ResultRecommendation[]; kept: boolean }) {
  const [copied, setCopied] = useState<string | null>(null);
  // 추천안이 생기기 전 결과에는 칸 자체가 없다. 빈 배열은 만들어 봤지만 검사를 통과한 추천이 없다는 뜻이다.
  if (!items) return null;
  if (items.length === 0) return <p className={styles.none}>이 문항은 지금 문장 그대로 충분해 따로 드릴 다른 시각 추천안이 없습니다.</p>;
  const copy = async (item: ResultRecommendation) => {
    try { await navigator.clipboard.writeText(item.sentence); setCopied(item.id); } catch { setCopied(null); }
  };
  return <section className={styles.list} aria-label="다른 시각 추천안">
    <header><div><b>다른 시각 추천안 <small>선택</small></b><p>{kept
      ? "지금 문장 그대로도 충분합니다. 아래는 다른 시각에서 본 표현이니, 본인 스타일에 맞는 것만 골라 쓰세요."
      : "아래는 다른 시각에서 본 표현입니다. 본인 스타일에 맞는 것만 골라 쓰세요."}</p></div></header>
    {items.map(item => <article key={item.id} data-kind={item.kind}>
      <span>{item.kind === "add" ? "확인 후 사용" : "같은 내용, 다른 시각"}</span>
      <blockquote>{item.anchorQuote}</blockquote>
      <p className={styles.sentence}>{item.sentence}</p>
      <p className={styles.why}>{item.why}</p>
      {item.needsConfirmation && <p className={styles.confirm}><b>사용 전 확인</b>{item.needsConfirmation}</p>}
      <button type="button" onClick={() => copy(item)}>{copied === item.id ? <><Check/> 복사됨</> : <><Clipboard/> 이 문장 복사</>}</button>
    </article>)}
  </section>;
}
