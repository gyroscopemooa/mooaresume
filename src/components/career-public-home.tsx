import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Compass, FileText, LayoutDashboard, Sparkles } from "lucide-react";
import styles from "./career-public-home.module.css";

const assessments = [
  { id: "01", name: "직업흥미 탐색", method: "RIASEC · BETA", meta: "30문항 · 약 5분", description: "선호하는 활동과 문제 해결 방식", href: "/career/interest", icon: Compass },
  { id: "02", name: "업무성향 분석", method: "IPIP BIG FIVE", meta: "50문항 · 약 7분", description: "업무 방식과 선호 환경", href: "/career/work-style", icon: BarChart3 },
  { id: "03", name: "직업가치 탐색", method: "WORK VALUES · BETA", meta: "18문항 · 약 4분", description: "일에서 중요하게 보는 조건", href: "/career/values", icon: Sparkles },
] as const;

export function CareerPublicHome() {
  return <main className={styles.workspace}>
    <aside className={styles.sidebar}><Link href="/" className={styles.brand}>MOOA<span>.</span></Link><p>CAREER<br />WORKSPACE</p><nav><span className={styles.active}><LayoutDashboard />커리어 탐색</span><Link href="/career/profile"><BarChart3 />커리어 프로필</Link><Link href="/onboarding"><FileText />지원서 분석</Link></nav><small>EXPLORE FIRST<br />SAVE WHEN READY</small></aside>
    <section className={styles.main}><header className={styles.topbar}><div><b>MOOA / CAREER</b><span>직무 탐색 도구</span></div><Link href="/entry">로그인</Link></header><div className={styles.mobileBrand}><Link href="/">MOOA<span>.</span></Link><Link href="/entry">로그인</Link></div>
      <section className={styles.overview}><div><small>CAREER EXPLORATION</small><h1>커리어 탐색</h1><p>활동 선호, 업무 방식, 근무 조건을 분리해 확인합니다. 결과는 실제 경험과 지원 공고를 검토하는 기준으로 사용합니다.</p></div><div className={styles.flow}><span>01</span><ArrowRight /><span>02</span><ArrowRight /><span>03</span><ArrowRight /><span>04</span><p>응답 <i /> 결과 확인 <i /> 경험 검토 <i /> 지원서 연결</p></div></section>
      <section className={styles.primaryGrid}><article className={styles.assessmentPanel}><div className={styles.panelHead}><div><small>AVAILABLE ASSESSMENTS</small><h2>이용 가능한 검사</h2></div><span>03</span></div><div className={styles.assessmentList}>{assessments.map((assessment) => { const Icon = assessment.icon; return <Link key={assessment.id} href={assessment.href}><i>{assessment.id}</i><Icon /><div><small>{assessment.method}</small><b>{assessment.name}</b><span>{assessment.description}</span></div><em>{assessment.meta}</em><ArrowRight /></Link>; })}</div></article><article className={styles.profilePanel}><div className={styles.panelHead}><div><small>CAREER PROFILE</small><h2>종합 커리어 프로필</h2></div><CheckCircle2 /></div><p>완료한 검사 결과를 한 화면에서 비교합니다. 로그인 후 이 기기의 결과를 프로필에 보관하고, 필요할 때 지원서 분석에 연결할 수 있습니다.</p><ul><li>탐색 결과 비교</li><li>실제 응답 기반 그래프</li><li>경험·공고 검토 질문</li></ul><Link href="/career/profile">프로필 열기 <ArrowRight /></Link></article></section>
      <section className={styles.bottomGrid}><article><small>APPLICATION CONNECTION</small><h2>지원서에 쓸 경험을 검토합니다.</h2><p>검사 결과를 근거로 내용을 만들지 않습니다. 실제로 했던 업무·문제 해결·협업 경험을 고르는 보조 기준으로 사용합니다.</p><Link href="/onboarding">지원서 분석으로 이동 <ArrowRight /></Link></article><article><small>INTERPRETATION BOUNDARY</small><h2>결과 해석 기준</h2><p>점수는 개인의 능력, 직업 적합성, 채용 결과를 판단하거나 예측하는 지표가 아닙니다.</p></article></section>
    </section>
  </main>;
}
