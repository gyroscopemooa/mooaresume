import Link from "next/link";
import { ArrowRight, ListOrdered, PenLine, ShieldCheck, Target } from "lucide-react";
import styles from "./intro.module.css";

/**
 * 포트폴리오 도구 아래에 붙는 소개.
 *
 * 다른 도구들과 같은 이유로 한 주소에 둡니다. 이 글이 검색으로 들어온 사람과
 * 크롤러가 읽는 유일한 본문입니다. "포트폴리오 만들기"로 찾아오는 사람 상당수는
 * 서식/템플릿을 기대하므로, **여기서 파는 것이 글이라는 점**을 위쪽에서 분명히
 * 말합니다 — 기대가 어긋난 채로 결제까지 가면 그게 환불입니다.
 */
export function PortfolioGuide() {
  return <div className={styles.guide} id="portfolio-guide">
    <section className={styles.section}>
      <span className={styles.kicker}>AI PORTFOLIO WRITER</span>
      <h2 className={styles.sectionHead}>서식이 아니라, 설명을 써 드립니다</h2>
      <div className={styles.cards}>
        <article className={styles.card}>
          <PenLine />
          <b>프로젝트마다 여섯 덩이로 정리</b>
          <p>소개 · 담당 역할 · 문제 · 실행 · 성과 · 사용 기술. 포트폴리오를 읽는 사람이 찾는 순서 그대로입니다. 아는 대로 적어 주시면 이 여섯 칸으로 나눠 씁니다.</p>
        </article>
        <article className={styles.card}>
          <ListOrdered />
          <b>전체 목차와 한 줄 요약</b>
          <p>프로젝트가 여러 개면 앞에 목차가 필요합니다. 프로젝트별 한 줄 요약을 만들어 목차로 묶어 드립니다.</p>
        </article>
        <article className={styles.card}>
          <Target />
          <b>지원 직무에 맞춰 강조를 바꿉니다</b>
          <p>&quot;서비스 기획자&quot;처럼 방향을 적으면 그 직무가 볼 만한 부분을 앞세우고 그쪽 말로 씁니다. 없는 경험을 만들지는 않습니다.</p>
        </article>
        <article className={styles.card}>
          <ShieldCheck />
          <b>없는 성과는 지어내지 않습니다</b>
          <p>포트폴리오에서 가장 흔한 거짓말이 &quot;30% 개선&quot;입니다. 적어 주시지 않은 수치는 쓰지 않고, 비워 둔 채로 무엇을 채워야 하는지 알려 드립니다.</p>
        </article>
      </div>
    </section>

    <section className={styles.section}>
      <h2 className={styles.sectionHead}>자주 묻는 것</h2>
      <div className={styles.faq}>
        <div className={styles.faqItem}><b>PPT 디자인도 만들어 주나요?</b><p>아니요. 여기서 만드는 것은 <b>글</b>입니다. 만들어 드린 설명글을 쓰시던 PPT·노션·PDF 어디에든 붙여 넣으시면 됩니다. 서식을 앞세운 포트폴리오보다 설명이 분명한 포트폴리오가 잘 읽힙니다.</p></div>
        <div className={styles.faqItem}><b>개발·디자인이 아니어도 쓸 수 있나요?</b><p>네. 기획·마케팅·상담·사무직도 프로젝트 단위로 정리하면 포트폴리오가 됩니다. 오히려 작업물 이미지가 없는 직군일수록 설명글이 전부입니다.</p></div>
        <div className={styles.faqItem}><b>프로젝트가 하나뿐인데요.</b><p>하나여도 됩니다. 값은 프로젝트 개수와 무관하게 1건 정액입니다.</p></div>
        <div className={styles.faqItem}><b>성과 수치를 모르면 어떻게 하나요?</b><p>비워 두고 무엇을 확인하면 좋을지 알려 드립니다. 모르는 수치를 채워 넣는 것이 가장 위험합니다 — 면접에서 산출 근거를 물으면 그 자리에서 무너집니다.</p></div>
      </div>
    </section>

    <section className={styles.closing}>
      <b>포트폴리오를 정리했다면, 다음은 자기소개서입니다</b>
      <p>같은 프로젝트를 자기소개서에서 다시 쓸 때 표현이 어긋나면 면접에서 먼저 걸립니다. 첨삭에서 이력서·포트폴리오·자소서가 서로 맞는지 함께 봅니다.</p>
      <Link href="/analyze">자기소개서 첨삭 보기 <ArrowRight /></Link>
    </section>

    <section className={styles.seoLead}>
      <p><b>포트폴리오 만들기에서 대부분 막히는 지점은 서식이 아닙니다.</b> 빈 페이지를 열어 두고 &quot;이 프로젝트를 어떻게 설명하지&quot;에서 멈춥니다. 무엇부터 써야 할지, 팀이 한 일과 내가 한 일을 어떻게 나눠 적어야 할지, 성과를 어디까지 적어도 되는지가 어렵습니다.</p>
      <p>그래서 이 도구는 서식을 주지 않고 <b>설명의 뼈대</b>를 채웁니다. 프로젝트마다 소개·담당 역할·문제·실행·성과·사용 기술로 나누고, 여러 프로젝트를 한 줄 요약과 목차로 묶습니다. 포트폴리오 양식, 포트폴리오 템플릿을 찾아오셨다면 채워야 할 것이 결국 이 내용입니다.</p>
      <p>정리한 글은 DOCX로 내려받아 쓰시던 PPT·노션·PDF에 옮기면 됩니다. 적어 주신 사실만 씁니다 — 없는 수치나 역할을 채워 주지 않고, 확인이 필요한 부분은 <Link href="/analyze">자기소개서 첨삭</Link>에서 다른 서류와 어긋나지 않는지 함께 볼 수 있습니다.</p>
    </section>
  </div>;
}
