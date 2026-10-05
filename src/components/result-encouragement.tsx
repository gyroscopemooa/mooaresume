"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Compass, Heart, MoonStar, RefreshCw, Users } from "lucide-react";
import { encouragementMessages, nextEncouragementIndex } from "@/domain/encouragement";
import styles from "./result-encouragement.module.css";

export function ResultEncouragement({ onReview, onFinal }: { onReview: () => void; onFinal: () => void }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setIndex(Math.floor(Math.random() * encouragementMessages.length)), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const message = encouragementMessages[index];
  return <section className={styles.root} aria-label="당신의 다음 걸음을 응원합니다">
    <div className={styles.hero}>
      <div className={styles.horizon} aria-hidden="true"><MoonStar /><span /></div>
      <span className={styles.eyebrow}>A NOTE FOR YOUR NEXT CHAPTER</span>
      <h2>당신의 다음 걸음을<br />진심으로 응원합니다.</h2>
      <p className={styles.intro}>한 장의 자기소개서 뒤에 쌓인 고민과 노력.<br />그 시간을 가볍게 여기지 않겠습니다.</p>
      <div className={styles.message} aria-live="polite" aria-atomic="true">
        <Heart aria-hidden="true" /><h3>{message.title}</h3><p>{message.body}</p>
      </div>
      <button className={styles.refresh} onClick={() => setIndex(value => nextEncouragementIndex(value, Math.random()))}><RefreshCw size={16} /> 다른 응원 읽기</button>
      <small className={styles.signature}>MOOA가 전하는 응원 · 직접 쓴 {encouragementMessages.length}개의 이야기</small>
    </div>
    <div className={styles.next}>
      <div><span className={styles.eyebrow}>YOUR NEXT STEP</span><h3>필요한 만큼, 다음 준비도 함께.</h3><p>새 결제 없이 지금 결과에서 이어서 확인할 수 있어요.</p></div>
      <div className={styles.cards}>
        <button onClick={onReview}><Compass /><strong>내 경험을 내 말로</strong><span>문항별 첨삭에서 수정 이유와 사실 확인 사항을 다시 살펴보세요.</span><b>문항별 첨삭 보기 <ArrowRight size={16} /></b></button>
        <button onClick={onFinal}><Heart /><strong>제출 전 마지막 확인</strong><span>최종 첨삭본에서 회사명·경험·글자 수를 확인하고 복사하세요.</span><b>최종 첨삭본 보기 <ArrowRight size={16} /></b></button>
        <article><Users /><span className={styles.badge}>준비 중</span><strong>현직자·재직자와 연결</strong><span>직무를 먼저 경험한 사람의 관점을 만날 수 있는 연계를 준비하고 있습니다.</span><small>아직 제공되지 않는 기능입니다. 일정·방식은 확정되지 않았으며, 현재 신청이나 결제는 받지 않습니다.</small></article>
      </div>
      <p className={styles.disclaimer}>좋은 결과를 기원합니다. 응원과 첨삭은 합격 보장이 아니며, 채용 결과는 지원 요건·경험·경쟁 상황 등 여러 요소에 따라 달라집니다.</p>
    </div>
  </section>;
}
