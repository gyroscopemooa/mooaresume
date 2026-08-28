import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Compass, FileText, LayoutDashboard, Sparkles } from "lucide-react";
import styles from "./career-home-dashboard.module.css";

const assessments = [
  { id: "01", label: "직업흥미 탐색", method: "RIASEC · BETA", meta: "30문항 · 약 5분", description: "어떤 활동과 문제 해결에 자연스럽게 끌리는지 탐색합니다.", href: "/career/interest" },
  { id: "02", label: "업무성향 분석", method: "IPIP BIG FIVE", meta: "50문항 · 약 7분", description: "일을 대하는 방식과 선호 업무환경을 돌아봅니다.", href: "/career/work-style" },
  { id: "03", label: "직업가치 탐색", method: "WORK VALUES · BETA", meta: "18문항 · 약 4분", description: "일에서 포기하기 어려운 조건을 정리합니다.", href: "/career/values" },
] as const;

export function CareerHomeDashboard() {
  return <main className={styles.shell}>
    <aside className={styles.sidebar}><Link className={styles.brand} href="/">MOOA<span>.</span></Link><p>CAREER<br />INTELLIGENCE</p><nav><span className={styles.active}><LayoutDashboard />커리어 홈</span><Link href="/career/interest"><Compass />직업흥미 탐색</Link><Link href="/career/work-style"><BarChart3 />업무성향 분석</Link><Link href="/career/values"><Sparkles />직업가치 탐색</Link><Link href="/career/profile"><FileText />종합 커리어 프로필</Link></nav><small>PRIVATE BY DEFAULT<br />RESULTS STAY YOURS</small></aside>
    <section className={styles.content}>
      <header className={styles.mobileHeader}><Link href="/">MOOA<span>.</span></Link><p>CAREER</p></header>
      <div className={styles.topline}><span>CAREER / EXPLORATION</span><Link href="/career/profile">내 프로필 <ArrowRight /></Link></div>
      <div className={styles.intro}><div><h1>내 커리어를<br /><em>정리할 기준</em>부터.</h1><p>검사는 정답이나 채용 결과를 말하지 않습니다. 내가 했던 경험과 다음 지원을 더 잘 읽기 위한 단서를 만듭니다.</p></div><Link className={styles.primary} href="/career/interest">탐색 시작하기 <ArrowRight /></Link></div>
      <section className={styles.kpis} aria-label="커리어 탐색 구성"><article><strong>03</strong><span>현재 탐색 가능한<br />커리어 관점</span></article><article><strong>98</strong><span>응답 문항 수<br />전체 합계</span></article><article><strong>01</strong><span>다음 단계<br />실제 경험 연결</span></article></section>
      <section className={styles.grid}><article className={styles.flow}><div className={styles.cardHead}><div><span>CAREER FLOW</span><h2>검사 후에는 이렇게 사용해요</h2></div><b>01—04</b></div><ol><li><i>01</i><div><b>한 가지 탐색부터 시작</b><small>흥미 · 업무성향 · 가치 중 지금 궁금한 관점을 고릅니다.</small></div><CheckCircle2 /></li><li><i>02</i><div><b>내 응답을 결과로 확인</b><small>점수는 비교·예측이 아니라 자기이해를 위한 단서입니다.</small></div><CheckCircle2 /></li><li><i>03</i><div><b>실제 경험을 다시 보기</b><small>결과와 맞닿는 경험, 선호 환경, 지원 기준을 떠올립니다.</small></div><CheckCircle2 /></li><li><i>04</i><div><b>자소서·공고와 연결</b><small>필요할 때만 내 지원서 분석으로 이어갈 수 있습니다.</small></div><ArrowRight /></li></ol></article><article className={styles.status}><div className={styles.cardHead}><div><span>ASSESSMENT STATUS</span><h2>이용 가능한 검사</h2></div><b>03</b></div><div className={styles.statusList}>{assessments.map((assessment, index) => <Link key={assessment.id} href={assessment.href}><i>{assessment.id}</i><div><small>{assessment.method}</small><b>{assessment.label}</b><span>{assessment.meta}</span></div><em className={index === 1 ? styles.available : ""}>{index === 1 ? "AVAILABLE" : "BETA"}</em></Link>)}</div></article></section>
      <section className={styles.library}><div className={styles.cardHead}><div><span>START AN ASSESSMENT</span><h2>지금 필요한 한 가지</h2></div><p>결과는 언제든 종합 프로필에서 함께 볼 수 있어요.</p></div><div className={styles.assessmentCards}>{assessments.map((assessment) => <article key={assessment.id}><span>{assessment.id}</span><small>{assessment.method}</small><h3>{assessment.label}</h3><p>{assessment.description}</p><div><em>{assessment.meta}</em><Link href={assessment.href}>시작 <ArrowRight /></Link></div></article>)}</div></section>
      <footer className={styles.footer}><p><b>결과의 범위</b> 이 도구는 자기이해와 직무 탐색을 돕습니다. 능력·직업 적합성·채용 결과를 판정하거나 예측하지 않습니다.</p><Link href="/career/profile">종합 커리어 프로필 보기 <ArrowRight /></Link></footer>
    </section>
  </main>;
}
