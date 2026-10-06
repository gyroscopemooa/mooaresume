import { ArrowDown, Check, Fingerprint } from "lucide-react";
import styles from "./landing-consistency-b.module.css";

/** 사용자 승인으로 운영 홈의 A 섹션 바로 아래에도 표시하는 B안. */
export function LandingConsistencyB() {
  return <section className={`container ${styles.root}`} aria-labelledby="consistency-b-title">
    <div className={styles.intro}>
      <p className={styles.eyebrow}>MOOA의 첨삭 기준</p>
      <h2 id="consistency-b-title">판단 기준은 일관되게,<br/><em>표현은 나답게.</em></h2>
      <p className={styles.lead}>좋은 표현이 꼭 하나일 필요는 없으니까요.<br/>그렇다고 고칠 이유까지 달라져서는 안 되니까요.</p>
      <p className={styles.description}>사람마다 편한 말투와 표현은 다릅니다. MOOA가 지향하는 첨삭은 같은 글과 지원 조건에서 문제를 짚고 수정 방향을 정하는 기준은 일관되게, 표현은 지원자의 목소리를 살리는 것입니다.</p>
      <div className={styles.signature}><Fingerprint aria-hidden="true"/><span>다듬은 뒤에도,<br/><strong>여전히 나의 이야기.</strong></span></div>
    </div>
    <div className={styles.paper}>
      <div className={styles.paperTop}><span>지키는 것과 다듬는 것</span><span aria-hidden="true">M / R</span></div>
      <article className={styles.preserve}>
        <span className={styles.label}>지킬 중심</span>
        <h3>내가 겪은 일, 내가 한 행동</h3>
        <p>지원자의 사실과 경험을 지킵니다.<br/>없는 성과로 더 그럴듯하게 만들지 않습니다.</p>
        <div className={styles.tags}><span><Check aria-hidden="true"/>사실</span><span><Check aria-hidden="true"/>경험</span><span><Check aria-hidden="true"/>나의 말투</span></div>
      </article>
      <div className={styles.transition}><span/><ArrowDown aria-hidden="true"/><span/></div>
      <article className={styles.refine}>
        <span className={styles.label}>다듬을 부분</span>
        <h3>과장은 덜고, 전달은 또렷하게</h3>
        <p>근거 없는 단정과 논리의 빈틈을 살피고,<br/>경험의 의미가 더 잘 전해지도록 다듬습니다.</p>
      </article>
      <p className={styles.bottom}>하나의 정답 문장보다,<br/><strong>나를 정확히 전하는 글을 위해.</strong></p>
    </div>
    <p className={styles.note}>생성형 AI의 결과에는 표현과 일부 판단의 차이가 생길 수 있습니다. MOOA는 그 차이를 줄이기 위해 첨삭 기준을 검증하고 다듬고 있습니다.</p>
  </section>;
}
