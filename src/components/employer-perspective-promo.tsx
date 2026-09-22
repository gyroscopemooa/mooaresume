import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import styles from "./employer-perspective-promo.module.css";

export function EmployerPerspectivePromo() {
  return (
    <section className={`container ${styles.stackSection}`} aria-labelledby="employer-perspective-title">
      <div className={styles.copy}>
        <span className={styles.eyebrow}>자소서 수정의 기준</span>
        <h2 id="employer-perspective-title">자소서는 내가 원하는 방향이 아닌,<br /><em>회사가 원하는 방향으로.</em></h2>
        <p>자소서 수정은 본인이 원하는 방향이 아닌, 회사가 원하는 방향으로 이루어져야 합니다.</p>
        <p>무아레쥬메는 <b>수많은 데이터와 경험을 토대로 해당 산업과 기업이 원하는 방식으로 수정하고, 직무와 연관되게 첨삭합니다.</b></p>
        <Link href="/pro/polish" className={styles.cta}>지원 기업·직무에 맞춰 첨삭하기 <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
      <aside className={styles.recruit} aria-labelledby="expert-recruit-title">
        <div className={styles.recruitCopy}>
        <span className={styles.badge}>상시 모집 중</span>
        <h3 id="expert-recruit-title">현장의 시선을 함께 더할 분을 찾습니다.</h3>
        <p>취업컨설턴트 · 다양한 직무의 재직자·현직자 · 인사담당자</p>
        <p className={styles.note}>여러 산업과 직무의 경험으로 무아레쥬메와 함께할 전문가의 연락을 기다립니다.</p>
        </div>
        <a href="mailto:support@mooaresume.com"><Mail size={17} aria-hidden="true" /><span>모집·협업 문의<strong>support@mooaresume.com</strong></span></a>
      </aside>
    </section>
  );
}
