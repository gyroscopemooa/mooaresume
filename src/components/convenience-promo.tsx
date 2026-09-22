import Link from "next/link";
import { ArrowRight, Files, ListChecks, FileCheck2 } from "lucide-react";
import styles from "./convenience-promo.module.css";

export function ConveniencePromo() {
  return (
    <section className={`container ${styles.section}`} aria-labelledby="convenience-promo-title">
      <div className={styles.header}>
        <span className={styles.eyebrow}>자료 정리부터 첨삭본까지, 한곳에서</span>
        <h2 id="convenience-promo-title">한 방에,<em> 간편하게.</em></h2>
        <p>자료는 한 번에. 기업이 요구하는 자소서 형태로.</p>
        <p>AI에 직접 요청할 수 있어도, 자료를 나누고 문항마다 설명하고 답변을 다시 맞추는 일은 여전히 내 몫이 됩니다. 무아레쥬메는 그 번거로운 준비와 정리를 덜어드립니다.</p>
      </div>
      <ol className={styles.steps}>
        <li><Files aria-hidden="true" /><span>01 · 한 번에 넣기</span><h3>따로 정리하느라 힘 빼지 마세요</h3><p>자소서 초안, 이력서, 경력기술서와 경험 메모까지. 가진 자료를 한곳에 붙여넣거나 파일로 올리세요.</p></li>
        <li><ListChecks aria-hidden="true" /><span>02 · 정리 맡기기</span><h3>문항과 직무에 맞춰 구성합니다</h3><p>알려주신 기업의 문항과 글자 수 기준을 바탕으로, 자료 속 실제 경험을 직무와 연결해 작성·첨삭합니다.</p></li>
        <li><FileCheck2 aria-hidden="true" /><span>03 · 결과 확인하기</span><h3>문항별 수정본을 한곳에서</h3><p>수정된 내용과 확인할 부분을 함께 보고, 사실관계를 검토한 뒤 복사해 활용하세요.</p></li>
      </ol>
      <div className={styles.footer}>
        <p><strong>직접 할 수 있는 일도, 더 간편하게.</strong><br />자료를 챙겨 넣는 시작부터 자소서를 다듬는 마무리까지 무아레쥬메에 맡기세요.</p>
        <Link href="/onboarding">자료 한 번에 넣고 시작하기 <ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
