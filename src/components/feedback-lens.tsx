import styles from "./feedback-lens.module.css";

/*
 * Landing section that explains what the page-wide glass lens (LandingLens) is
 * showing. This part is static: the lens itself lives in landing-lens.tsx and
 * follows the mouse over the whole landing page. The phrases marked
 * data-lens-mark are the ones that light up inside the glass.
 * The sample sentence is fictional, not a real applicant's text.
 */
export function FeedbackLens() {
  return (
    <section className={`container ${styles.section}`} aria-labelledby="feedback-lens-title">
      <div className={styles.head}>
        <span>SENTENCE LENS</span>
        <h2 id="feedback-lens-title">좋아 보이는 문장도,<br />확대하면 비어 있는 곳이 보입니다.</h2>
        <p>PC에서 마우스를 이 문장 위로 가져가 보세요. 읽는 사람이 “그래서 뭘 했는데?”라고 되물을 부분이 돋보기 안에서 켜집니다.</p>
      </div>

      <div className={styles.stage}>
        <div className={styles.paper}>
          <p>
            저는 생산 현장에서 불량률을 줄이기 위해 <mark data-lens-mark>열심히 노력했습니다.</mark> 팀원들과 협력하여{" "}
            <mark data-lens-mark>좋은 성과</mark>를 냈고, 이 경험을 통해 <mark data-lens-mark>많이 배웠습니다.</mark> 귀사에서도
            최선을 다해 기여하겠습니다.
          </p>
        </div>
      </div>
      <small className={styles.note}>예시 문장입니다. 실제 지원자의 글이 아닙니다.</small>

      <ul className={styles.points}>
        <li><b>열심히 노력했습니다</b><span>무엇을 어떻게 했는지가 빠져 있어요.</span></li>
        <li><b>좋은 성과</b><span>숫자나 비교 기준이 없어 확인할 수 없어요.</span></li>
        <li><b>많이 배웠습니다</b><span>무엇을 배웠는지 말하지 않았어요.</span></li>
      </ul>
    </section>
  );
}
