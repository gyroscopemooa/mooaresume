import { ShieldCheck } from "lucide-react";
import styles from "./landing-consistency.module.css";

/**
 * 홈 소개 섹션: "첨삭 결과는 같아야 할까요, 매번 달라야 할까요?"
 *
 * 제품 철학 문서(docs/analysis-consistency-and-rounded-editing-philosophy.md)의 한 문단을
 * 방문자 말로 옮긴 것입니다. 같아야 하는 것은 판단(문제 파악·수정할 지점·첨삭의 중점),
 * 달라도 되는 것은 표현입니다.
 *
 * 문구는 약속이 아니라 기준으로 씁니다. 생성형 AI는 같은 입력에도 문장이 달라지고, 어느
 * 문항을 고칠지의 판정도 실행마다 갈린 적이 있어서(docs/quick-revision-stability-2026-10-06.md)
 * "항상 같게 나온다"고 쓰면 아직 지킬 수 없는 말이 됩니다. 판정을 고정하는 작업이 끝나
 * 같은 입력의 반복 결과가 실제로 같다고 측정되면 그때 문구를 바꿉니다.
 */
export function LandingConsistency() {
  return (
    <section className={`container ${styles.root}`} aria-labelledby="landing-consistency-title">
      <span className={styles.label}>SAME STANDARD · YOUR VOICE</span>
      <h2 id="landing-consistency-title" className={styles.title}>
        자소서 첨삭 결과는 같아야 할까요?<br /><em>매번 달라야 할까요?</em>
      </h2>
      <p className={styles.lead}>
        사람이 첨삭해도 누가 보느냐에 따라 의견이 달라집니다. 서류를 심사하는 쪽도 마찬가지예요.
        같은 지원서를 두고도 읽는 사람의 기준과 가치관에 따라 평가가 갈리곤 합니다.
      </p>
      <p className={styles.question}>그렇다면 AI 첨삭은 매번 달라도 될까요, 항상 같은 결과가 나와야 할까요?</p>

      <div className={styles.answer}>
        <small className={styles.answerLabel}>MOOA의 답</small>
        <div className={styles.split}>
          <article className={`${styles.card} ${styles.same}`}>
            <span className={styles.tag}>판단은 같아야 해요</span>
            <ul>
              <li>문제 파악</li>
              <li>수정할 지점</li>
              <li>첨삭의 중점</li>
            </ul>
            <p>첨삭 철학에 따라, 같은 글은 같은 기준으로 봅니다.</p>
          </article>
          <article className={`${styles.card} ${styles.free}`}>
            <span className={styles.tag}>표현은 달라도 돼요</span>
            <ul>
              <li>문장의 뉘앙스</li>
              <li>말투</li>
            </ul>
            <p>읽는 사람마다 가치관이 다르니, 어떤 표현으로 낼지는 지원자가 고릅니다.</p>
          </article>
        </div>
        <p className={styles.closing}>판단은 같은 기준으로, 표현은 내 선택으로.</p>
      </div>

      <p className={styles.note}>
        <ShieldCheck aria-hidden="true" />
        <span>생성형 AI는 같은 입력에도 문장이 조금씩 달라질 수 있어요. MOOA는 그 차이가 판단이 아니라 표현에서만 생기도록 기준을 다듬고 있습니다.</span>
      </p>
    </section>
  );
}
