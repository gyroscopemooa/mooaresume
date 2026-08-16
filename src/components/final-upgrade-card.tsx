import { ArrowRight, MessageCircleMore, Sparkles } from "lucide-react";
import styles from "./final-upgrade-card.module.css";

export function FinalUpgradeCard() {
  return <section className={styles.card}>
    <div className={styles.icon}><MessageCircleMore /></div>
    <div>
      <span>FINAL · Coming Soon</span>
      <h2>완성한 지원서로 실제 모의면접까지 이어가세요.</h2>
      <p>PRO 결과의 예상질문을 바탕으로 답변 평가, 동적 꼬리질문, 취약질문 재훈련과 최종 리포트를 제공합니다.</p>
      <ul><li><Sparkles/> 인터랙티브 AI 모의면접</li><li><Sparkles/> 답변 평가와 꼬리질문</li><li><Sparkles/> 취약질문 재훈련</li></ul>
    </div>
    <aside><small>PRO 이용자 업그레이드</small><strong>+5,000원</strong><em>총 14,900원</em><button type="button" disabled>출시 예정 <ArrowRight/></button></aside>
  </section>;
}
