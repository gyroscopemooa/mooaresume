import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleHelp, FileText, ShieldCheck } from "lucide-react";
import styles from "./page.module.css";

const questions = [
  ["자료를 어떻게 넣나요?", "채용공고는 링크, 직접 입력, 파일 첨부로 넣을 수 있습니다. 자기소개서는 전체 붙여넣기 또는 PDF·DOCX·TXT·MD 파일 하나를 올려 주세요."],
  ["추가 경험은 꼭 자세히 써야 하나요?", "아니요. 운전면허, 아르바이트, 해외생활처럼 짧게 적어도 됩니다. 필요한 사실만 추가로 확인합니다."],
  ["파일을 올리면 바로 외부로 전송되나요?", "아니요. 현재 지원 문서는 브라우저에서 먼저 읽습니다. 스캔 PDF와 사진 OCR은 결제 후 분석을 시작할 때만 처리합니다."],
  ["사진이나 스캔 PDF도 되나요?", "현재는 텍스트 추출이 제한될 수 있습니다. 결제 후 문서 인식을 지원할 예정이며, 중요한 내용은 직접 입력해 두는 것이 안전합니다."],
  ["AI가 없는 경험을 만들어 내나요?", "만들지 않습니다. 확인되지 않은 역할·성과·수치는 사용하지 않고, 필요한 경우 확인 질문으로 남깁니다."],
  ["작성 스타일은 언제 고르나요?", "자료를 먼저 넣은 뒤 마지막에 담백하게·균형 있게·강점 살리기 중 하나를 선택합니다."],
];

export default function GuidePage() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><span>M</span> MOOA <b>Resume</b></Link>
      <Link href="/" className={styles.back}><ArrowLeft /> 홈으로</Link>
    </header>
    <div className={styles.container}>
      <div className={styles.hero}><span className={styles.eyebrow}>MOOA GUIDE</span><h1>처음 써도 어렵지 않게,<br />필요한 것만 알려드릴게요.</h1><p>입력 화면은 간단하게 유지하고, 자세한 이용방법과 자주 묻는 질문은 여기에서 확인하세요.</p></div>
      <section className={styles.flow}><div><FileText /><b>자료 입력</b><span>공고·자소서·경험</span></div><ArrowRight /><div><CircleHelp /><b>필요한 사실 확인</b><span>부족한 내용만 질문</span></div><ArrowRight /><div><Check /><b>분석·작성</b><span>스타일을 반영한 결과</span></div></section>
      <section className={styles.notice}><ShieldCheck /><p><b>개인정보와 사실을 우선합니다.</b><br />확인되지 않은 경험이나 성과를 임의로 만들지 않습니다.</p></section>
      <section className={styles.faq}><div className={styles.sectionHead}><span className={styles.eyebrow}>FAQ</span><h2>자주 묻는 질문</h2></div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</section>
      <section className={styles.cta}><div><b>바로 시작해도 괜찮아요.</b><p>자료를 먼저 넣고, 필요한 안내는 진행 중에 확인할 수 있습니다.</p></div><Link href="/onboarding">입력 시작하기 <ArrowRight /></Link></section>
    </div>
  </main>;
}