import { ShieldCheck } from "lucide-react";
import styles from "./consultant-review-banner.module.css";

export function ConsultantReviewBanner() {
  return (
    <section className={`container ${styles.banner}`} aria-labelledby="consultant-review-title">
      <div className={styles.icon}><ShieldCheck aria-hidden="true" /></div>
      <div className={styles.copy}>
        <span className={styles.label}>첨삭 이후에도 이어지는 케어</span>
        <h2 id="consultant-review-title">24시간, 첨삭 이후까지 살피는 AI 취업 컨설턴트</h2>
        <p>무아레쥬메는 첨삭이 끝난 뒤에도 AI 취업 컨설턴트가 결과를 한 번 더 꼼꼼히 검토합니다. 보완이 필요한 경우, 추가 비용 없이 더 나은 첨삭본을 전달해 드립니다.</p>
        <p className={styles.note}>추가 첨삭은 검토 결과에 따라 필요한 경우 제공됩니다.</p>
      </div>
      <span className={styles.badge}>필요한 보완은<br /><strong>추가 비용 없이</strong></span>
    </section>
  );
}
