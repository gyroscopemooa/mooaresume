import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./cover-letter-philosophy.module.css";

export function CoverLetterPhilosophy() {
  return (
    <section className={`container ${styles.section}`} aria-labelledby="cover-letter-philosophy-title">
      <div className={styles.intro}>
        <span className={styles.eyebrow}>커리어 컨설턴트의 시선</span>
        <div className={styles.questions} aria-label="자소서에 대한 솔직한 질문들">
          <span>결국 소설 아닌가요?</span>
          <span>구라 아닌가요?</span>
          <span>구라로 작성해도 되나요?</span>
        </div>
        <h2 id="cover-letter-philosophy-title">자소서,<br />거짓말 아닌가요?</h2>
        <strong>당연히 거짓말로 작성하면 안 됩니다.</strong>
        <p>자소서는 실제 경험을 바탕으로 나를 설명하는 글입니다. 그런데 그 안에는 경험의 내용 외에도 생각과 소신, 일에 대한 태도, 표현 방식까지 함께 담깁니다.</p>
        <p><b>무아레쥬메는 자소서를 여러 관점에서 읽습니다.</b></p>
      </div>
      <div className={styles.body}>
        <div className={styles.points}>
          <article><span>01</span><h3>같은 글에서도 서로 다른 것을 봅니다</h3><p>누군가는 직무 경험을, 누군가는 논리와 문장 호응을 눈여겨봅니다. 어떤 선택을 했는지에서 생각과 소신을, 말투와 표현에서 일에 대한 태도를 읽는 사람도 있습니다. 모든 평가자의 관점이 같지는 않습니다.</p></article>
          <article><span>02</span><h3>내용 너머의 세밀한 부분도 드러납니다</h3><p>무엇을 중요하게 여기고, 어떤 근거로 설명하며, 읽는 사람을 얼마나 고려하는지. 글에는 커뮤니케이션, 문서작성, 의사전달 능력을 가늠할 단서도 담길 수 있습니다. 경험의 내용만 생각하면 함께 어필할 수 있는 부분을 놓치기 쉽습니다.</p></article>
          <article><span>03</span><h3>평범한 경험도 여러 각도로 살펴봅니다</h3><p>편의점 아르바이트도 실제로 한 일과 그때의 판단이 출발점입니다. 무슨 경험인지에 그치지 않고, 지원 업무와의 연결과 그 경험을 설명하는 방식까지 봅니다. 사실과 개성은 살리면서 불필요한 오해를 줄이는 것이 우리의 첨삭입니다.</p></article>
        </div>
        <div className={styles.closing}>
          <h3>자소서는 적힌 내용보다 많은 것을 보여줍니다.</h3>
          <p>“어차피 지어내는 이야기”라고만 생각하면, 글에 담겨 드러나는 강점과 세밀한 표현을 놓칠 수 있습니다. 무아레쥬메는 <b>커리어 컨설팅 경험을 바탕으로 내용·직무 연결·논리·표현·전달 방식에 담긴 다양한 관점을 함께 고려해 분석하고 첨삭합니다.</b></p>
          <Link href="/result/sample">이 관점이 담긴 첨삭 예시 보기 <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </div>
      <div className={styles.focus}>
        <div>
          <span className={styles.eyebrow}>한정된 분량, 선명한 핵심</span>
          <h3>한 장에 인생을 모두 담을 수는 없습니다.<br />핵심을 함축하고 간추려, 원하는 바를 전달하는 능력도 드러납니다.</h3>
          <p>정해진 양식과 분량 안에 모든 인생을 옮겨 담는 것은 당연히 불가능합니다. 무엇을 남기고 무엇을 덜어낼지 판단하고, 핵심을 함축하고 간추려 자신이 전달하려는 바를 상대방에게 명확하게 전하는 능력도 자소서에서 읽힐 수 있습니다. 무아레쥬메는 이 관점까지 함께 살펴, 내 경험과 강점이 의도한 대로 전달되도록 다듬습니다.</p>
        </div>
        <div className={styles.build}>
          <span className={styles.eyebrow}>PRO BUILD · 내용 보완</span>
          <h3>반대로, 쓸 내용이 없다면?</h3>
          <p>작은 스토리부터 알려주세요. 무아레쥬메가 실제 경험 속 행동과 배운 점을 직무와 연결해, 자소서에 담을 내용으로 설계해 드립니다. 부족한 근거는 확인 질문으로 함께 채워갑니다.</p>
          <Link href="/pro/build">작은 경험부터 PRO BUILD로 <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}
