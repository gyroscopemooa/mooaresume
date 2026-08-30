import Link from "next/link";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, Compass, FileText, ShieldCheck, Target } from "lucide-react";
import styles from "./career-ai-sample-report.module.css";

export function CareerAiSampleReport() {
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link className={styles.brand} href="/career">MOOA <b>CAREER</b></Link>
      <span>SAMPLE REPORT · 02 / 02</span>
      <Link className={styles.back} href="/career/ai/sample?scope=interest"><ArrowLeft />1페이지 요약</Link>
    </header>

    <section className={styles.intro}>
      <p>AI DEEP INTERPRETATION · EXAMPLE</p>
      <h1>직업흥미 결과를<br /><em>경험의 언어</em>로 바꾸는 방식</h1>
      <p className={styles.description}>이 페이지는 실제 심층해설 결과의 구성 예시입니다. 아래 점수·사례는 예시 인물의 데이터이며, 현재 내 결과나 직업 추천이 아닙니다.</p>
    </section>

    <section className={styles.reportCover}>
      <div><small>EXAMPLE SUBJECT</small><h2>직업흥미 탐색 리포트</h2><p>RIASEC 6영역 중 높게 나온 활동 선호를 출발점으로, 실제 경험과 공고를 읽을 기준을 정리합니다.</p></div>
      <div className={styles.coverCode}><span>INTEREST</span><b>ISA</b><small>EXAMPLE ONLY</small></div>
    </section>

    <section className={styles.axes} aria-label="예시 상위 흥미 영역">
      <article><small>01</small><b>탐구 I</b><span>복잡한 문제를 이해하고 원인을 찾는 활동</span></article>
      <article><small>02</small><b>사회 S</b><span>사람을 돕고 설명하며 함께 해결하는 활동</span></article>
      <article><small>03</small><b>예술 A</b><span>새로운 표현과 방식으로 결과를 만드는 활동</span></article>
    </section>

    <section className={styles.reportGrid}>
      <div className={styles.mainColumn}>
        <article className={styles.summaryCard}>
          <div className={styles.cardLabel}><Compass />01 · 해설 요약</div>
          <h2>“이해하고, 연결하고, 더 나은 방식으로 설명하는 일”에 동기가 생기는 예시입니다.</h2>
          <p>예시 인물은 문제의 구조를 파악하는 과정에 흥미를 느끼고, 그 내용을 다른 사람이 이해할 수 있도록 풀어내며, 표현 방식까지 개선할 때 몰입할 가능성이 있습니다. 이는 특정 직업의 적합 판정이 아니라, 경험을 돌아볼 때 쓸 수 있는 가설입니다.</p>
        </article>
        <article className={styles.evidenceCard}>
          <div className={styles.cardLabel}><FileText />02 · 경험에서 확인할 근거</div>
          <h2>점수 대신, 이미 해 본 일을 대조합니다.</h2>
          <ul>
            <li><CheckCircle2 /><span><b>탐구</b> 낯선 문제의 원인이나 자료를 파고들어 해결한 경험이 있었나요?</span></li>
            <li><CheckCircle2 /><span><b>사회</b> 팀원·고객·동료에게 내용을 설명하거나 지원한 순간이 있었나요?</span></li>
            <li><CheckCircle2 /><span><b>예술</b> 문서·발표·서비스의 전달 방식을 더 이해하기 쉽게 바꾼 경험이 있었나요?</span></li>
          </ul>
        </article>
      </div>
      <aside className={styles.sideColumn}>
        <article><div className={styles.cardLabel}><Target />03 · 공고를 읽는 기준</div><p>직무명이 아니라 실제 업무 내용을 확인합니다.</p><ol><li>해결해야 할 문제가 분석·조사 중심인지</li><li>사람과 협업하거나 설명하는 비중이 있는지</li><li>제안·개선·표현 방식을 스스로 설계할 여지가 있는지</li></ol></article>
        <article><div className={styles.cardLabel}><BriefcaseBusiness />04 · 다음 질문</div><p>실제 해설에서는 이 질문에 답한 뒤, 지원서에 쓸 경험을 함께 좁힙니다.</p><Link href="/onboarding">지원서 경험 정리하기 <ArrowRight /></Link></article>
      </aside>
    </section>

    <section className={styles.process}>
      <div><small>ACTUAL REPORT FLOW</small><h2>실제 심층해설은<br />이 순서로 완성됩니다.</h2></div>
      <ol><li><i>01</i><span><b>검사 결과 선택</b>개별 결과 또는 세 검사 종합을 선택</span></li><li><i>02</i><span><b>경험·지원 자료 추가</b>사용자가 직접 제공한 이력서·자소서·공고만 사용</span></li><li><i>03</i><span><b>해설과 확인 질문</b>근거, 추가 질문, 지원서 연결 기준을 함께 제시</span></li></ol>
    </section>

    <section className={styles.boundary}><ShieldCheck /><p>실제 서비스에서도 AI는 채용 결과·합격 가능성·직업 적합성을 판정하거나 예측하지 않습니다. 사용자가 제공한 자료와 검사 결과를 구분해, 확인할 질문과 다음 행동을 정리하는 보조 도구로만 사용합니다.</p></section>
    <footer className={styles.footer}><span>© MOOA Resume · 예시 리포트 · 02 / 02</span><div><Link href="/career/ai/sample?scope=interest"><ArrowLeft />1페이지 요약</Link><Link href="/career/ai?scope=interest">해설 선택 화면으로 <ArrowRight /></Link></div></footer>
  </main>;
}