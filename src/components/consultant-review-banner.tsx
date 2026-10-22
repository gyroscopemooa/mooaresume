import { ShieldCheck } from "lucide-react";
import styles from "./consultant-review-banner.module.css";

export function ConsultantReviewBanner() {
  return (
    <section className={`container ${styles.banner}`} aria-labelledby="consultant-review-title">
      <div className={styles.icon}><ShieldCheck aria-hidden="true" /></div>
      <div className={styles.copy}>
        <span className={styles.label}>첨삭 이후에도 이어지는 케어</span>
        <h2 id="consultant-review-title">24시간 안에, 다른 시각의 추가 첨삭</h2>
        <p>무아레쥬메는 첨삭이 끝난 뒤 24시간 안에 임의로 선별된 첨삭본을 다른 시각으로 한 번 더 살펴, 추가 비용 없이 추가 첨삭본을 전달해 드립니다. 1차 첨삭 내용은 그대로 두고 문항마다 다른 시각의 추천 문장을 더해, 본인 스타일에 맞는 문장을 고르실 수 있습니다.</p>
        <p className={styles.note}>추가 첨삭은 1차보다 개선되었다는 의미가 아니며, 선별된 첨삭 건에 제공됩니다.</p>
      </div>
      <span className={styles.badge}>다른 시각 추천안<br /><strong>추가 비용 없이</strong></span>
    </section>
  );
}
