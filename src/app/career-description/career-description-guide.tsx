import Link from "next/link";
import { ArrowRight, FileSearch, Layers, ShieldCheck, Sparkles } from "lucide-react";
import styles from "./intro.module.css";

/**
 * 경력기술서 도구 아래에 붙는 소개.
 *
 * 이력서 소개(`resume/resume-guide.tsx`)와 같은 이유로 도구와 한 주소에 둡니다.
 * 도구 화면은 브라우저에서만 그려지는 부분이 있어(`ssr: false`인 파일 업로드
 * 상호작용) 크롤러가 받는 HTML의 상당 부분은 이 소개 글입니다. "직무기술서",
 * "경력기술서 양식"처럼 서로 다른 말로 찾아오는 사람이 같은 것을 찾고 있다는
 * 점을 본문에서 짚어 둡니다.
 */
export function CareerDescriptionGuide() {
  return <div className={styles.guide} id="career-description-guide">
    <section className={styles.section}>
      <span className={styles.kicker}>AI CAREER DESCRIPTION BUILDER</span>
      <h2 className={styles.sectionHead}>흩어진 자료를 경력기술서 한 장으로</h2>
      <div className={styles.cards}>
        <article className={styles.card}>
          <Layers />
          <b>여러 자료를 한 문서로 합칩니다</b>
          <p>이력서, 자기소개서, 경력증명서, 자격증, 수료증을 한꺼번에 올리면 회사별로 소속·직무·기간·담당업무를 정리합니다. 자료를 찾아 옮겨 적는 시간을 줄이는 것이 이 기능이 하는 일입니다.</p>
        </article>
        <article className={styles.card}>
          <Sparkles />
          <b>지원하는 방향에 맞춰 순서를 바꿉니다</b>
          <p>&quot;심리상담사 채용에 맞춰서&quot;처럼 방향을 적으면 같은 경력에서도 무엇을 앞세우고 무엇을 줄일지가 바뀝니다. 없는 경험을 새로 만들지는 않습니다 — 순서와 분량만 바뀝니다.</p>
        </article>
        <article className={styles.card}>
          <ShieldCheck />
          <b>없는 경력은 만들지 않습니다</b>
          <p>자료로 확인되지 않는 회사·기간·성과는 비워 두고 무엇이 확인되지 않는지 알려 드립니다. 결과의 각 줄에는 어느 자료에서 나온 내용인지도 함께 남습니다.</p>
        </article>
        <article className={styles.card}>
          <FileSearch />
          <b>DOCX로 내려받아 바로 손봅니다</b>
          <p>완성본은 화면에서 바로 확인하고, 워드와 한글에서 모두 열리는 DOCX 파일로 내려받아 회사 제출 양식에 맞게 다듬을 수 있습니다.</p>
        </article>
      </div>
    </section>

    <section className={styles.section}>
      <h2 className={styles.sectionHead}>자주 묻는 것</h2>
      <div className={styles.faq}>
        <div className={styles.faqItem}><b>경력기술서와 직무기술서, 같은 건가요?</b><p>다른 문서입니다. <b>경력기술서</b>는 지원자가 &quot;내가 이런 일을 했고 이런 성과를 냈다&quot;를 정리해 내는 문서이고, <b>직무기술서(JD)</b>는 회사가 &quot;이 자리는 이런 일을 하고 이런 역량이 필요하다&quot;를 정의해 공고에 붙이는 문서입니다. 이 도구가 만드는 것은 앞의 것입니다. 회사가 낸 직무기술서를 읽고 내 경험과 맞춰 보고 싶다면 <Link href="/analyze">자기소개서 첨삭의 채용공고 분석</Link>이 그 일을 합니다.</p></div>
        <div className={styles.faqItem}><b>자료를 하나도 준비 못 했는데 써도 되나요?</b><p>네. 파일이 없어도 기억나는 대로 적는 줄글만으로 시작할 수 있습니다. 다만 자료가 있으면 기간·수치 같은 사실이 더 정확해집니다.</p></div>
        <div className={styles.faqItem}><b>없는 경력을 부풀려 써 주나요?</b><p>아니요. 자료에 없는 회사·기간·성과·자격은 만들지 않습니다. 확인되지 않는 부분은 비워 두고 결과 화면에서 무엇이 비었는지 알려 드립니다.</p></div>
        <div className={styles.faqItem}><b>결제 전에 자료가 서버에 저장되나요?</b><p>아니요. 결제 전에는 자료를 서버로 보내지 않습니다. 결제가 확인된 뒤 만드는 요청에만 자료가 실리고, 결과를 돌려준 뒤에는 저장하지 않습니다.</p></div>
      </div>
    </section>

    <section className={styles.closing}>
      <b>경력기술서를 다 만들었다면, 다음은 자기소개서입니다</b>
      <p>정리한 경력을 자기소개서 첨삭에서 근거로 함께 쓸 수 있습니다. 이력서·경력기술서·자기소개서가 서로 어긋나지 않는지까지 봐야 면접에서 걸리지 않습니다.</p>
      <Link href="/analyze">자기소개서 첨삭 보기 <ArrowRight /></Link>
    </section>

    <section className={styles.seoLead}>
      <p><b>경력기술서 양식을 찾는 이유는 대개 하나입니다.</b> 여러 회사, 여러 서류에 흩어진 경력을 한 장으로 어떻게 정리해야 할지 막막해서입니다. 경력증명서를 회사에 요청하고, 예전 이력서를 열어 보고, 자격증 사진을 뒤지는 그 과정 자체가 시간이 오래 걸립니다.</p>
      <p>이 도구는 그 자료들을 한꺼번에 받아 <b>회사 · 소속 · 직무 · 기간 · 담당업무 · 성과</b> 순서로 정리합니다. 최신 경력이 위로 오고, 재직 개월 수도 자동으로 계산합니다. 자격증·수료증·해외경험처럼 특정 회사에 매이지 않는 사실은 참고사항으로 따로 모읍니다.</p>
      <p>다만 경력기술서는 <b>사실을 적는 서류</b>입니다. 문장을 꾸며 주는 도구가 아니고, 없는 경력이나 성과 수치를 채워 주지도 않습니다. 완성한 경력기술서에 적힌 사실이 <Link href="/analyze">자기소개서</Link>와 어긋나지 않는지는 함께 확인하는 것이 좋습니다 — 면접에서 가장 먼저 걸리는 지점이 그 어긋남입니다.</p>
    </section>
  </div>;
}
