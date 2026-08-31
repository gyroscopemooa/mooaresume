import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, LayoutDashboard, ShieldCheck, Target } from "lucide-react";
import { getCareerAiSample, type CareerAiSampleScope } from "@/domain/career-ai-sample";
import styles from "./career-ai-sample-overview.module.css";

export function CareerAiSampleOverview({ scope }: { scope: CareerAiSampleScope }) {
  const sample = getCareerAiSample(scope);
  const query = `scope=${sample.scope}`;
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link className={styles.brand} href="/career">MOOA <b>CAREER</b></Link>
      <nav><Link href="/career"><LayoutDashboard />커리어 홈</Link><Link className={styles.active} href={`/career/ai/sample?${query}`}>AI 심층해설</Link></nav>
      <span>RESULT</span>
    </header>
    <section className={styles.hero}>
      <div className={styles.kicker}>AI 심층해설 리포트</div>
      <div className={styles.typeCode}><small>CAREER PROFILE</small><b>{sample.code}</b><div><strong>{sample.typeName}</strong><span>{sample.badge}</span></div></div>
      <h1>{sample.headline}</h1><p>{sample.intro}</p>
    </section>
    {scope === "interest" && <section className={styles.characterCard}>
      <div><small>ISA CHARACTER</small><b>ISA<br />지식 연결가</b><p>복잡한 문제를 이해한 뒤, 사람에게 전달할 수 있는 언어와 방식으로 바꾸는 데 강점이 드러납니다.</p><span>I는 문제를 파고드는 힘, S는 설명·협업의 힘, A는 표현과 개선의 힘을 보완합니다.</span></div>
      <figure><Image src="/images/career-characters/riasec-i.png" alt="ISA 캐릭터 비주얼" fill sizes="(max-width: 760px) 100vw, 420px" quality={100} unoptimized /></figure>
    </section>}
    <section className={styles.designPicker} aria-label="심층해설 디자인 선택">
      <div><small>CHOOSE A REPORT STYLE</small><h2>결과 화면 형식을 선택해 보세요.</h2><p>결과의 해설 내용은 유지하고, 디자인과 정보 배치만 다르게 구성했습니다.</p></div>
      <div className={styles.designLinks}>
        <Link className={styles.selectedDesign} href={`/career/ai/sample?${query}&design=1`}><b>디자인 1</b><span>에디토리얼 요약형</span><ArrowRight /></Link>
        <Link href={`/career/ai/sample?${query}&design=2`}><b>디자인 2</b><span>문서형 심층 리포트</span><ArrowRight /></Link>
        <Link href={`/career/ai/sample?${query}&design=3`}><b>디자인 3</b><span>대시보드 브리프형</span><ArrowRight /></Link>
      </div>
    </section>
    {scope === "interest" && <Link className={styles.characterResultLink} href={`/career/character?code=${sample.code}&example=1`}>ISA 캐릭터 결과 카드 보기 <ArrowRight /></Link>}
    <section className={styles.mainGrid}>
      <article className={styles.profileCard}>
        <div className={styles.cardHead}><div><small>RESULT SNAPSHOT</small><h2>{sample.axesLabel}</h2></div><span>{sample.badge}</span></div>
        <div className={styles.axisBars}>{sample.axes.map((axis) => <div key={axis.label}><span><b>{axis.label}</b><em>{axis.score}</em></span><i><i style={{ width: `${axis.score}%` }} /></i><small>{axis.description}</small></div>)}</div>
        <div className={styles.legend}><i />응답 결과 요약 <b>결과 해석</b></div>
      </article>
      <article className={styles.narrativeCard}>
        <div className={styles.cardHead}><div><small>01 · 해석의 출발점</small><h2>한 줄 요약</h2></div><Target /></div>
        <p className={styles.lead}>{sample.headline} <strong>현재 결과</strong>입니다.</p>
        <div className={styles.quote}>“직업을 맞히는 답이 아니라, 내가 실제로 좋아했던 일과 잘 해낸 경험을 찾기 위한 출발점입니다.”</div>
        <div className={styles.tags}>{sample.axes.map((axis) => <span key={axis.label}>{axis.label}</span>)}</div>
      </article>
    </section>
    <section className={styles.profileSummary}>
      <article><small>STRENGTHS · 강점으로 쓰기 좋은 방식</small><h2>{sample.strengths}</h2><p>{sample.strengthGuide}</p></article>
      <article><small>WATCH OUT · 주의할 환경</small><h2>{sample.watchOut}</h2><p>{sample.watchGuide}</p></article>
      <article><small>EXPLORE · 더 살펴볼 직무 분야</small><div className={styles.roleList}>{sample.roles.map((role) => <span key={role}>{role}</span>)}</div><p>추천 순위가 아니라, 실제 업무 내용과 내 경험을 비교해 볼 출발점입니다.</p></article>
    </section>
    <section className={styles.exploration}>
      <header><small>CAREER EXPLORATION</small><h2>직무 하나가 아니라, 여러 경로를 비교해 봅니다.</h2><p>아래는 현재 결과이 경험과 공고를 대조하며 살펴볼 후보입니다. 추천 순위나 취업 보장이 아닙니다.</p></header>
      <article><small>ROLE OPTIONS · 직무 탐색</small><ul>{sample.roleDetails.map((role) => <li key={role.title}><b>{role.title}</b><span>{role.description}</span></li>)}</ul></article>
      <article><small>INDUSTRY OPTIONS · 산업 분야</small><div className={styles.industryList}>{sample.industries.map((industry) => <span key={industry}>{industry}</span>)}</div></article>
      <article><small>APPLICATION CHECKS · 공고와 경험 비교</small><ol>{sample.applicationChecks.map((check, index) => <li key={check}><b>{index + 1}. {check}</b><span>내 경험에서 이를 뒷받침할 장면이 있었는지 먼저 확인합니다.</span></li>)}</ol></article>
    </section>
    <section className={styles.insightGrid}>
      <article><div><FileText /><small>02 · 결과를 근거와 연결</small></div><h2>점수만 보여주지 않습니다.</h2><p>상위 축이 같은 방향인지, 서로 다른 상황에서 나타난 신호인지 구분하고 각 해석 옆에 경험 질문을 붙입니다.</p></article>
      <article><div><CheckCircle2 /><small>03 · 응답 품질은 조심스럽게 확인</small></div><h2>시간으로 성향을 판정하지 않습니다.</h2><p>지나치게 빠른 응답·반복 응답·미응답은 결과를 확정하지 못하는 이유로만 표시합니다.</p></article>
      <article><div><Target /><small>04 · 다음 행동으로 번역</small></div><h2>공고·이력서에서 볼 기준을 만듭니다.</h2><p>특정 직업을 맞힌다고 말하는 대신, 실제 지원 전에 비교할 업무와 조건을 제안합니다.</p></article>
    </section>
    <section className={styles.quality}><div><small>WHY THIS IS PAID-LEVEL WORK</small><h2>AI 해설의 값어치는<br />긴 문장이 아니라 <em>근거 있는 연결</em>입니다.</h2></div><ul><li><CheckCircle2 /><span><b>검사 간 연결</b>종합 해설은 세 결과의 공통점과 충돌 지점을 함께 읽습니다.</span></li><li><CheckCircle2 /><span><b>내 경험과 대조</b>사용자가 직접 올린 이력서·자소서·공고에서만 근거를 찾습니다.</span></li><li><CheckCircle2 /><span><b>추가 질문과 수정</b>모호한 부분은 단정 대신 질문으로 남기고 답변 뒤 업데이트합니다.</span></li></ul></section>
    <section className={styles.next}><div><small>PAGE 01 / 02</small><h2>요약을 봤다면,<br />이제 <em>긴 해설</em>로 넘어갑니다.</h2><p>두 번째 페이지에서는 상위 축을 실제 경험·지원 공고와 연결해 읽는 편지형 리포트가 이어집니다.</p></div><Link href={`/career/ai/sample?${query}&page=2`}>2페이지 해설 보기 <ArrowRight /></Link></section>
    <section className={styles.boundary}><ShieldCheck /><p>이 리포트는 자기이해와 커리어 탐색을 돕습니다. 제공 자료와 해석을 구분하며, 채용 결과·합격 가능성·직업 적합성을 예측하거나 보장하지 않습니다.</p></section>
    <footer className={styles.footer}><span>© MOOA Resume · AI 심층해설</span><Link href={`/career/ai?scope=${sample.scope}`}>해설 선택 화면으로 <ArrowRight /></Link></footer>
  </main>;
}