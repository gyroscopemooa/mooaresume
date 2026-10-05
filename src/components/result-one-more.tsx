"use client";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { nextOneMoreIndex, oneMoreLines } from "@/domain/one-more-lines";
import styles from "./result-one-more.module.css";

/**
 * "한 장 더" 탭. 기존 ResultEncouragement(어두운 히어로·영문 eyebrow)는
 * 지우지 않고 남겨 두고, 탭이 이 담백한 변형을 띄웁니다. 되돌리려면
 * result-workspace-complete.tsx의 탭 두 줄만 바꾸면 됩니다.
 */
export function ResultOneMore({ onReview, onFinal }: { onReview: () => void; onFinal: () => void }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setIndex(Math.floor(Math.random() * oneMoreLines.length)), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return <section className={styles.root} aria-label="한 장 더">
    <p className={styles.kicker}>여기까지 오느라 수고했어요. 한 장만 더.</p>
    <blockquote className={styles.line} aria-live="polite">{oneMoreLines[index]}</blockquote>
    <button className={styles.again} onClick={() => setIndex((value) => nextOneMoreIndex(value, Math.random()))}>다른 문장</button>

    <hr className={styles.rule} />

    <h3 className={styles.heading}>이어서 해볼 만한 것</h3>
    <ul className={styles.list}>
      <li><button onClick={onReview}><span><b>왜 고쳤는지 다시 보기</b><small>문항별 첨삭에서 수정·유지 이유와 확인할 사실을 봅니다.</small></span><ArrowRight size={16} aria-hidden="true" /></button></li>
      <li><button onClick={onFinal}><span><b>제출 전에 한 번 더</b><small>최종 첨삭본에서 회사명·글자 수를 확인하고 복사합니다.</small></span><ArrowRight size={16} aria-hidden="true" /></button></li>
      <li className={styles.soon}><span><b>현직자·재직자 이야기 듣기</b><small>그 일을 먼저 해 본 사람과 연결하는 기능을 준비하고 있어요. 지금은 신청이나 결제를 받지 않습니다.</small></span><em>준비 중</em></li>
    </ul>

    <p className={styles.note}>좋은 결과를 진심으로 바랍니다. 이 문장들과 첨삭은 합격을 보장하지 않으며, 채용 결과는 지원 요건·경험·경쟁 상황에 따라 달라집니다.</p>
  </section>;
}
