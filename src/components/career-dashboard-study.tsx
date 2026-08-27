import Link from "next/link";
import { ArrowUpRight, BarChart3, Check, ChevronRight, Compass, FileText, Menu, Sparkles } from "lucide-react";
import styles from "./career-dashboard-study.module.css";

const metrics = [
  { label: "완료한 탐색", value: "03", note: "업무성향 · 직업흥미 · 직업가치" },
  { label: "다음 연결", value: "02", note: "자소서 분석 · 공고 비교" },
  { label: "프로필 상태", value: "준비", note: "로그인 후 내 계정에 저장" },
] as const;

export function CareerDashboardStudy() {
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/career" className={styles.brand}>MOOA<span>.</span></Link><button type="button" aria-label="메뉴 열기"><Menu /></button></header>
    <section className={styles.hero}>
      <p className={styles.eyebrow}>CAREER ASSESSMENT / 2026</p>
      <h1>내가 일하는 방식을<br /><em>보이는 언어</em>로<br />바꿉니다.</h1>
      <p className={styles.lede}>직업흥미와 업무성향을 한 곳에 모아, 다음 지원에서 꺼내 쓸 경험과 기준을 정리하세요.</p>
      <Link href="/career/interest" className={styles.cta}>탐색 시작하기 <ArrowUpRight /></Link>
    </section>
    <section className={styles.productFrame} aria-label="커리어 프로필 대시보드 예시">
      <aside className={styles.sidebar}><b>MOOA / PROFILE</b><nav><span className={styles.navActive}><Compass />커리어 프로필</span><span><BarChart3 />탐색 결과</span><span><FileText />지원서 연결</span></nav><small>PRIVATE PROFILE<br />DEMO VIEW</small></aside>
      <div className={styles.dashboard}>
        <div className={styles.dashHeader}><div><small>CAREER PROFILE</small><h2>김무아님의 탐색 요약</h2></div><span>UPDATED TODAY</span></div>
        <div className={styles.metrics}>{metrics.map((metric) => <article key={metric.label}><p>{metric.label}</p><strong>{metric.value}</strong><small>{metric.note}</small></article>)}</div>
        <div className={styles.chartRow}><article className={styles.interest}><div className={styles.cardHeading}><div><small>INTEREST PATTERN</small><h3>흥미가 높은 활동</h3></div><span>RIASEC</span></div><div className={styles.bars}>{[["탐구",87],["사회",76],["현실",68],["진취",54],["관습",43],["예술",39]].map(([label, score]) => <div key={String(label)}><span>{label}</span><i><b style={{ width: `${score}%` }} /></i><strong>{score}</strong></div>)}</div></article><article className={styles.snapshot}><div className={styles.cardHeading}><div><small>WORK STYLE</small><h3>업무환경 단서</h3></div><Sparkles /></div><p>명확한 문제를 깊게 파고들고, 근거를 정리해 다른 사람과 연결할 때 강점이 드러날 수 있어요.</p><ul><li><Check />문제 원인 분석</li><li><Check />협업을 위한 설명</li><li><Check />기준이 있는 개선</li></ul></article></div>
        <article className={styles.next}><div><small>NEXT STEP</small><h3>이 결과를 실제 지원서에 연결하세요.</h3><p>점수는 답이 아닙니다. 내 경험에서 확인할 장면을 고르는 출발점입니다.</p></div><button type="button">자소서 경험 찾기 <ChevronRight /></button></article>
      </div>
    </section>
    <section className={styles.statement}><p>CAREER PROFILE / 01</p><h2>검사는 대시보드로 끝나지 않습니다.<br />나의 경험과 다음 행동으로 이어집니다.</h2></section>
    <p className={styles.note}>디자인 시안입니다. 예시 이름·수치·문장은 실제 사용자 결과가 아닙니다.</p>
  </main>;
}
