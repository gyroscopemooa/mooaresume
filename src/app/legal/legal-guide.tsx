import { ArrowRight, FileStack, ListChecks, Scale, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { legalDocumentDefinitions, LEGAL_DOCUMENT_STAGE_LABEL, LEGAL_DOCUMENT_STAGE_ORDER } from "@/domain/legal-case";
import styles from "./intro.module.css";

/**
 * 법률 화면 아래에 붙는 소개.
 *
 * 문서 목록을 도메인에서 그대로 읽어 옵니다 — 소개 글에 문서 이름을 손으로
 * 적어 두면, 문서를 하나 더 만든 날 이 글만 옛말이 됩니다.
 */
export function LegalGuide() {
  return <div className={styles.guide} id="legal-guide">
    <section className={styles.section}>
      <span className={styles.kicker}>CASE-BASED LEGAL DRAFTING</span>
      <h2 className={styles.sectionHead}>문서 하나가 아니라, 사건 하나를 엽니다</h2>
      <div className={styles.cards}>
        <article className={styles.card}>
          <FileStack />
          <b>자료는 한 번만 올립니다</b>
          <p>계약서·문자·녹취록·판결문을 사건에 넣어 두면 그다음 문서들이 같은 자료를 씁니다. 준비서면을 쓸 때 계약서를 다시 찾지 않으셔도 됩니다.</p>
        </article>
        <article className={styles.card}>
          <ListChecks />
          <b>쟁점부터 정리합니다</b>
          <p>서면보다 먼저 필요한 것은 &quot;무엇이 다투어지고 있는가&quot;입니다. 사실관계·내 주장·상대 주장·다툼 없는 사실·유리한 증거·불리한 부분을 갈라 놓습니다.</p>
        </article>
        <article className={styles.card}>
          <Scale />
          <b>내 지위에 맞는 문서를 먼저</b>
          <p>소송을 거시려면 소장을, 소장을 받으셨다면 답변서를 앞에 놓습니다. 사용자는 문서 이름이 아니라 자기 상황으로 고릅니다.</p>
        </article>
        <article className={styles.card}>
          <ShieldAlert />
          <b>기한은 계산하지 않습니다</b>
          <p>항소기간처럼 놓치면 되돌릴 수 없는 기한은 AI의 산수에 맡기지 않습니다. 무엇을 언제부터 세는지 안내만 하고, 날짜는 반드시 직접 확인하시게 합니다.</p>
        </article>
      </div>
    </section>

    <section className={styles.section}>
      <h2 className={styles.sectionHead}>만들 수 있는 문서</h2>
      <div className={styles.faq}>
        {LEGAL_DOCUMENT_STAGE_ORDER.map((stage) => {
          const items = legalDocumentDefinitions.filter((definition) => definition.stage === stage);
          if (!items.length) return null;
          return <div key={stage} className={styles.faqItem}>
            <b>{LEGAL_DOCUMENT_STAGE_LABEL[stage]}</b>
            {items.map((definition) => <p key={definition.type}><b>{definition.label}</b> — {definition.whenToUse}</p>)}
          </div>;
        })}
      </div>
    </section>

    <section className={styles.section}>
      <h2 className={styles.sectionHead}>자주 묻는 것</h2>
      <div className={styles.faq}>
        <div className={styles.faqItem}><b>변호사 대신 쓸 수 있나요?</b><p>아니요. 여기서 만드는 것은 <b>제출용 초안</b>이고 법률 자문이 아닙니다. 사건의 결과를 좌우하는 판단은 전문가의 몫입니다. 다만 무엇을 정리해 가야 하는지 모른 채 상담을 받는 것보다, 쟁점과 증거를 정리해 가시는 편이 그 상담을 훨씬 값지게 씁니다.</p></div>
        <div className={styles.faqItem}><b>소송장이 맞나요, 소장이 맞나요?</b><p>&quot;소장&quot;이 맞습니다. 민사소송은 원고가 법원에 소장을 내면서 시작됩니다. 흔히 소송장이라고 부르시지만 서류 이름은 소장입니다.</p></div>
        <div className={styles.faqItem}><b>소장을 받았는데 뭘 써야 하나요?</b><p><b>답변서</b>입니다. 청구를 다투려면 정해진 기간 안에 답변서를 내고, 상대가 주장한 사실 하나하나에 인정·부인·부지를 밝혀야 합니다. 기한은 사건마다 다르니 받으신 서류에 적힌 안내를 꼭 확인해 주세요.</p></div>
        <div className={styles.faqItem}><b>항소장만 내면 되나요?</b><p>보통은 아닙니다. 항소장은 &quot;항소한다&quot;는 의사와 범위를 밝히는 짧은 서면이고, 실제로 다투는 내용은 <b>항소이유서</b>에 담깁니다. 둘은 제출 시점도 기한도 다르니 각각 확인해 주세요.</p></div>
        <div className={styles.faqItem}><b>올린 자료는 저장되나요?</b><p>네. 사건에 저장됩니다 — 같은 자료로 다음 문서를 만드는 것이 이 기능의 핵심이기 때문입니다. 본인만 볼 수 있고, 사건을 지우면 자료와 만든 문서도 함께 지워집니다.</p></div>
      </div>
    </section>

    <section className={styles.closing}>
      <b>취업 서류를 찾아오셨나요?</b>
      <p>이력서·자기소개서·경력기술서·포트폴리오는 다른 화면에서 다룹니다.</p>
      <Link href="/resume">취업 서류 보기 <ArrowRight /></Link>
    </section>

    <section className={styles.seoLead}>
      <p><b>법률 서면을 직접 쓰려는 사람이 가장 먼저 막히는 곳은 양식이 아닙니다.</b> 내 사건에서 무엇이 쟁점인지, 어떤 증거가 어느 주장을 받치는지, 지금 단계에서 무슨 서류를 내야 하는지를 모르는 상태에서 양식만 받으면 빈칸을 채울 수 없습니다.</p>
      <p>그래서 이 화면은 서면 양식을 먼저 주지 않고 <b>사건을 먼저 정리</b>합니다. 사실관계와 쟁점, 다툼 없는 사실과 다투는 사실, 가진 증거와 없는 증거를 갈라 놓은 다음, 그 정리를 바탕으로 내용증명·소장·답변서·준비서면·증거목록·항소이유서를 만듭니다. 나홀로소송, 셀프소송으로 찾아오셨다면 필요한 것이 결국 이 순서입니다.</p>
      <p>다시 한번 말씀드립니다. 여기서 나오는 것은 <b>초안</b>입니다. 제출 전 전문가 검토를 권하고, 제소기간·항소기간처럼 놓치면 되돌릴 수 없는 기한은 반드시 직접 확인해 주세요.</p>
    </section>
  </div>;
}
