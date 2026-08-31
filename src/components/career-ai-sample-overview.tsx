import Link from "next/link";
import { ArrowRight, BrainCircuit, CheckCircle2, Clock3, FileText, LayoutDashboard, ShieldCheck, Target } from "lucide-react";
import styles from "./career-ai-sample-overview.module.css";

export function CareerAiSampleOverview() {
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link className={styles.brand} href="/career">MOOA <b>CAREER</b></Link>
      <nav><Link href="/career"><LayoutDashboard />커리어 홈</Link><Link className={styles.active} href="/career/ai/sample?scope=interest">심층해설 예시</Link></nav>
      <span>EXAMPLE</span>
    </header>
    <section className={styles.hero}><div className={styles.kicker}>심층해설 리포트 · 예시</div><div className={styles.typeCode}><small>EXAMPLE TYPE</small><b>ISA</b><div><strong>지식 연결가</strong><span>탐구 · 사회 · 예술</span></div></div><h1>문제를 파고들고,<br /><em>사람에게 설명하는 편</em></h1><p>예시 인물의 직업흥미 코드입니다. 실제 리포트에서는 내 상위 2~3개 영역을 먼저 보여주고, 그다음 강점·주의 환경·살펴볼 직무 분야로 이어집니다.</p></section>
    <section className={styles.mainGrid}>
      <article className={styles.profileCard}>
        <div className={styles.cardHead}><div><small>EXAMPLE RESULT SNAPSHOT</small><h2>활동 선호의 분포</h2></div><span>RIASEC · 예시</span></div>
        <div className={styles.chartWrap}><svg viewBox="0 0 320 320" role="img" aria-label="직업흥미 예시 분포"><g className={styles.grid}><polygon points="160,20 281,90 281,230 160,300 39,230 39,90"/><polygon points="160,61 246,111 246,209 160,259 74,209 74,111"/><polygon points="160,102 211,132 211,188 160,218 109,188 109,132"/><line x1="160" y1="20" x2="160" y2="300"/><line x1="39" y1="90" x2="281" y2="230"/><line x1="39" y1="230" x2="281" y2="90"/></g><polygon className={styles.data} points="160,55 237,116 216,202 160,239 91,196 101,117"/></svg><span className={styles.labelI}>탐구 I</span><span className={styles.labelA}>예술 A</span><span className={styles.labelS}>사회 S</span><span className={styles.labelE}>진취 E</span><span className={styles.labelC}>관습 C</span><span className={styles.labelR}>현실 R</span></div>
        <div className={styles.legend}><i />예시 인물의 응답 분포 <b>현재 내 결과 아님</b></div>
      </article>
      <article className={styles.narrativeCard}>
        <div className={styles.cardHead}><div><small>01 · 해석의 출발점</small><h2>한 줄 요약</h2></div><BrainCircuit /></div>
        <p className={styles.lead}>자료를 살펴 문제를 이해하고, 그 내용을 사람에게 쉽게 설명하거나 더 나은 방식으로 바꿔 본 경험이 많은 <strong>예시 유형</strong>입니다.</p><div className={styles.quote}>“직업을 맞히는 답이 아니라, 내가 실제로 좋아했던 일과 잘 해낸 경험을 찾기 위한 출발점입니다.”</div><div className={styles.tags}><span>자료 정리</span><span>설명·협업</span><span>방식 개선</span></div>
      </article>
    </section>
    <section className={styles.profileSummary}>
      <article><small>STRENGTHS · 강점으로 쓰기 좋은 방식</small><h2>자료를 정리하고, 핵심을 쉽게 설명하며, 더 나은 방법을 찾는 편</h2><p>자소서나 면접에서는 “분석력이 좋아요”보다 어떤 문제를 어떻게 파고들고 정리했는지 실제 사례로 보여주는 쪽이 좋습니다.</p></article>
      <article><small>WATCH OUT · 주의할 환경</small><h2>이유를 알기 어려운 반복 업무나, 개선 여지가 거의 없는 환경</h2><p>약점 판정이 아닙니다. 일을 시작하기 전 “왜 이 일을 하는지”, “내가 바꿔 볼 여지가 있는지”를 확인하면 만족도를 가늠하는 데 도움이 됩니다.</p></article>
      <article><small>EXPLORE · 더 살펴볼 직무 분야</small><div className={styles.roleList}><span>리서치·분석</span><span>교육·콘텐츠 기획</span><span>서비스 기획·UX 리서치</span></div><p>추천 순위가 아니라, 실제 업무 내용과 내 경험을 비교해 볼 출발점입니다.</p></article>
    </section>
    <section className={styles.exploration}>
      <header><small>CAREER EXPLORATION · 예시</small><h2>직무 하나가 아니라, 여러 경로를 비교해 봅니다.</h2><p>아래는 ISA 예시 유형이 경험과 공고를 대조하며 살펴볼 수 있는 후보입니다. 추천 순위나 취업 보장이 아닙니다.</p></header>
      <article><small>ROLE OPTIONS · 직무 탐색</small><ul><li><b>UX 리서치 · 사용자 조사</b><span>문제를 파고들고 사용자에게 설명하는 경험이 함께 있는지 확인</span></li><li><b>서비스 기획 · 운영 기획</b><span>자료를 정리해 협업자가 실행할 수 있는 기준으로 바꾼 경험을 대조</span></li><li><b>교육 콘텐츠 · 러닝 디자인</b><span>복잡한 내용을 이해하기 쉬운 방식으로 풀어낸 경험을 대조</span></li><li><b>리서치 오퍼레이션 · 인사이트 분석</b><span>조사·정리·공유 과정에서 내가 맡았던 역할을 대조</span></li></ul></article>
      <article><small>INDUSTRY OPTIONS · 산업 분야</small><div className={styles.industryList}><span>에듀테크</span><span>HR 테크</span><span>B2B SaaS</span><span>데이터·리서치 서비스</span><span>공공·사회문제 해결</span><span>콘텐츠 플랫폼</span></div></article>
      <article><small>CAREER PATH · 진로 경로</small><ol><li><b>관심 분야 하나 선택</b><span>직무명보다 실제로 하고 싶은 업무 장면을 고릅니다.</span></li><li><b>작은 프로젝트·인턴·포트폴리오</b><span>조사, 분석, 설명, 개선 중 어떤 역할을 해냈는지 기록합니다.</span></li><li><b>공고와 경험을 대조</b><span>지원할 때 필요한 근거가 부족한 부분만 다음 학습으로 채웁니다.</span></li></ol></article>
      <article><small>LEARNING / CREDENTIAL · 준비 후보</small><ul><li><b>SQLD</b><span>데이터·분석 경로를 실제로 선택했을 때 검토할 수 있는 SQL 역량 자격입니다.</span></li><li><b>직업상담사 2급</b><span>진로·고용서비스를 직업으로 생각할 때 검토할 수 있는 국가기술자격입니다.</span></li><li><b>작은 포트폴리오 프로젝트</b><span>콘텐츠·기획·UX 계열은 자격증보다도 실제 조사·개선 사례가 먼저 필요한지 확인합니다.</span></li></ul><p className={styles.credentialNote}>자격은 유형만 보고 권하지 않습니다. 목표 직무가 정해진 뒤 응시요건·일정·채용공고의 실제 요구사항을 공식 기관에서 확인합니다.</p></article>
    </section>
    <section className={styles.insightGrid}>
      <article><div><FileText /><small>02 · 결과를 근거와 연결</small></div><h2>점수만 보여주지 않습니다.</h2><p>상위 2~3개 축이 같은 방향인지, 서로 다른 상황에서 나타난 신호인지 구분하고, 각 해석 옆에 확인할 경험 질문을 붙입니다.</p><span>예: “자료를 파고든 경험이 있었나요?”</span></article>
      <article><div><Clock3 /><small>03 · 응답 품질은 조심스럽게 확인</small></div><h2>시간으로 성향을 판정하지 않습니다.</h2><p>지나치게 빠른 응답·반복 응답·미응답은 결과를 확정하지 못하는 이유로만 표시합니다. 응답 시간 자체를 능력이나 성격으로 해석하지 않습니다.</p><span>예: “이 축은 다시 확인할 필요가 있어요.”</span></article>
      <article><div><Target /><small>04 · 다음 행동으로 번역</small></div><h2>공고·이력서에서 볼 기준을 만듭니다.</h2><p>특정 직업을 맞힌다고 말하는 대신, 업무 내용·협업 방식·개선 여지처럼 실제 지원 전에 비교할 조건을 제안합니다.</p><span>예: “문제 정의와 개선 권한이 있는가?”</span></article>
    </section>
    <section className={styles.quality}><div><small>WHY THIS IS PAID-LEVEL WORK</small><h2>AI 해설의 값어치는<br />긴 문장이 아니라 <em>근거 있는 연결</em>입니다.</h2></div><ul><li><CheckCircle2 /><span><b>검사 간 연결</b>흥미·업무성향·직업가치를 함께 했을 때 공통점과 충돌 지점을 읽습니다.</span></li><li><CheckCircle2 /><span><b>내 경험과 대조</b>사용자가 직접 올린 이력서·자소서·공고에서만 근거를 찾아 가설을 확인합니다.</span></li><li><CheckCircle2 /><span><b>추가 질문과 수정</b>모호한 부분은 단정 대신 질문으로 남기고, 답변을 받은 뒤 해설을 업데이트합니다.</span></li></ul></section>
    <section className={styles.next}><div><small>PAGE 01 / 02</small><h2>요약을 봤다면,<br />이제 <em>긴 해설</em>로 넘어갑니다.</h2><p>두 번째 페이지에서는 상위 축을 실제 경험·지원 공고와 연결해 읽는 편지형 리포트가 이어집니다.</p></div><Link href="/career/ai/sample?scope=interest&page=2">2페이지 해설 보기 <ArrowRight /></Link></section>
    <section className={styles.boundary}><ShieldCheck /><p>이 리포트는 자기이해와 커리어 탐색을 돕기 위한 예시입니다. 실제 서비스는 사용자 제공 자료와 AI 해석을 구분하고, 채용 결과·합격 가능성·직업 적합성을 예측하거나 보장하지 않습니다.</p></section>
    <footer className={styles.footer}><span>© MOOA Resume · 심층해설 예시</span><Link href="/career/ai?scope=interest">해설 선택 화면으로 <ArrowRight /></Link></footer>
  </main>;
}