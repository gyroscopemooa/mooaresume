import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Compass, FileText, LayoutDashboard, Sparkles } from "lucide-react";
import styles from "./career-public-home.module.css";

const assessments = [
  { id: "01", name: "직업흥미 탐색", method: "RIASEC · BETA", meta: "30문항 · 약 5분", description: "좋아하는 활동과 문제 해결 방향", href: "/career/interest", icon: Compass },
  { id: "02", name: "업무성향 분석", method: "IPIP BIG FIVE", meta: "50문항 · 약 7분", description: "일하는 방식과 선호 업무환경", href: "/career/work-style", icon: BarChart3 },
  { id: "03", name: "직업가치 탐색", method: "WORK VALUES · BETA", meta: "18문항 · 약 4분", description: "일에서 중요한 조건의 우선순위", href: "/career/values", icon: Sparkles },
] as const;

export function CareerPublicHome() {
  return <main className={styles.workspace}>
    <aside className={styles.sidebar}><Link href="/" className={styles.brand}>MOOA<span>.</span></Link><p>CAREER<br />WORKSPACE</p><nav><span className={styles.active}><LayoutDashboard />커리어 홈</span><Link href="/career/profile"><BarChart3 />내 커리어 프로필</Link><Link href="/onboarding"><FileText />자소서 연결</Link></nav><small>EXPLORE FIRST<br />SAVE WHEN READY</small></aside>
    <section className={styles.main}><header className={styles.topbar}><div><b>MOOA / CAREER</b><span>무료 커리어 탐색</span></div><Link href="/entry">로그인</Link></header><div className={styles.mobileBrand}><Link href="/">MOOA<span>.</span></Link><Link href="/entry">로그인</Link></div>
      <section className={styles.overview}><div><small>CAREER EXPLORATION</small><h1>어디서부터<br />살펴볼까요?</h1><p>검사 결과는 정답이 아닙니다. 실제 경험과 다음 지원을 더 잘 읽기 위한 단서입니다.</p></div><div className={styles.flow}><span>01</span><ArrowRight /><span>02</span><ArrowRight /><span>03</span><ArrowRight /><span>04</span><p>탐색 <i /> 결과 <i /> 경험 <i /> 지원서 연결</p></div></section>
      <section className={styles.primaryGrid}><article className={styles.assessmentPanel}><div className={styles.panelHead}><div><small>AVAILABLE ASSESSMENTS</small><h2>검사 시작하기</h2></div><span>03</span></div><div className={styles.assessmentList}>{assessments.map((assessment) => { const Icon = assessment.icon; return <Link key={assessment.id} href={assessment.href}><i>{assessment.id}</i><Icon /><div><small>{assessment.method}</small><b>{assessment.name}</b><span>{assessment.description}</span></div><em>{assessment.meta}</em><ArrowRight /></Link>; })}</div></article><article className={styles.profilePanel}><div className={styles.panelHead}><div><small>YOUR PROFILE</small><h2>결과는 여기로 모입니다</h2></div><CheckCircle2 /></div><p>검사를 마친 뒤에는 종합 커리어 프로필에서 업무성향·흥미·가치를 함께 확인할 수 있어요.</p><ul><li>완료한 탐색 결과 정리</li><li>실제 응답 기반 그래프</li><li>자소서 경험을 떠올리는 질문</li></ul><Link href="/career/profile">내 커리어 프로필 열기 <ArrowRight /></Link></article></section>
      <section className={styles.bottomGrid}><article><small>NEXT ACTION</small><h2>결과를 실제 경험과 연결하세요.</h2><p>문제 해결, 협업, 개선, 몰입했던 장면을 떠올리며 다음 지원의 기준을 정리합니다.</p><Link href="/onboarding">자소서 분석으로 이동 <ArrowRight /></Link></article><article><small>RESULT BOUNDARY</small><h2>점수는 채용 판단이 아닙니다.</h2><p>직업 적합성·능력·합격 가능성을 예측하지 않습니다. 각 결과의 범위와 한계는 검사 화면에서 안내합니다.</p></article></section>
    </section>
  </main>;
}
