import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Compass, FileText, LockKeyhole } from "lucide-react";
import styles from "./career-public-home.module.css";

const assessments = [
  { number: "01", name: "직업흥미 탐색", method: "RIASEC · BETA", meta: "30문항 · 약 5분", description: "어떤 활동과 문제 해결 방식에 끌리는지 탐색합니다.", href: "/career/interest" },
  { number: "02", name: "업무성향 분석", method: "IPIP BIG FIVE", meta: "50문항 · 약 7분", description: "일하는 방식과 선호 업무환경을 돌아봅니다.", href: "/career/work-style" },
  { number: "03", name: "직업가치 탐색", method: "WORK VALUES · BETA", meta: "18문항 · 약 4분", description: "일에서 포기하기 어려운 조건을 정리합니다.", href: "/career/values" },
] as const;

export function CareerPublicHome() {
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.brand}>MOOA<span>.</span></Link><div><Link href="/career/profile">내 커리어 프로필</Link><Link className={styles.login} href="/entry">로그인</Link></div></header>
    <section className={styles.hero}><p>CAREER ASSESSMENT / 2026</p><h1>내가 일하는 방식을<br /><em>보이는 언어</em>로<br />바꿉니다.</h1><div className={styles.heroBottom}><span>검사는 정답을 대신 정하지 않습니다.<br />다음 지원에서 꺼내 쓸 경험과 기준을 정리합니다.</span><Link href="/career/interest">직업흥미 탐색 시작 <ArrowUpRight /></Link></div></section>
    <section className={styles.preview}><div className={styles.previewHead}><div><small>HOW IT WORKS</small><h2>세 가지 관점을 모아<br />내 지원 기준을 만듭니다.</h2></div><span>PUBLIC PREVIEW<br />NO PERSONAL DATA</span></div><div className={styles.steps}><article><b>01</b><Compass /><h3>탐색</h3><p>궁금한 관점 하나를 골라 응답합니다.</p></article><article><b>02</b><CheckCircle2 /><h3>결과</h3><p>내 응답에서 두드러진 활동·환경 단서를 확인합니다.</p></article><article><b>03</b><FileText /><h3>연결</h3><p>실제 경험과 지원 공고를 다시 읽는 질문으로 사용합니다.</p></article></div><div className={styles.profilePrompt}><div><LockKeyhole /><p><b>그래프와 종합 결과는 내 커리어 프로필에서</b><br />로그인 후 완료한 검사 결과를 한 화면에 모아 볼 수 있어요.</p></div><Link href="/career/profile">내 프로필 열기 <ArrowUpRight /></Link></div></section>
    <section className={styles.library}><div className={styles.sectionHead}><p>ASSESSMENTS / 03</p><h2>지금 필요한<br />한 가지부터.</h2></div><div>{assessments.map((assessment) => <article key={assessment.number}><span>{assessment.number}</span><small>{assessment.method}</small><h3>{assessment.name}</h3><p>{assessment.description}</p><footer><em>{assessment.meta}</em><Link href={assessment.href}>시작 <ArrowUpRight /></Link></footer></article>)}</div></section>
    <section className={styles.disclaimer}><p><b>결과의 범위</b> 이 도구는 자기이해와 직무 탐색을 돕습니다. 능력·직업 적합성·채용 결과를 판정하거나 예측하지 않습니다. 베타 도구의 방법과 한계는 각 검사 화면에서 안내합니다.</p></section>
  </main>;
}
