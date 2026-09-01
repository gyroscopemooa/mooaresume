import Link from "next/link";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, Compass, FileText, ShieldCheck, Target } from "lucide-react";
import { getCareerAiSample, type CareerAiSampleScope } from "@/domain/career-ai-sample";
import styles from "./career-ai-sample-report.module.css";

export function CareerAiSampleReport({ scope }: { scope: CareerAiSampleScope }) {
  const sample = getCareerAiSample(scope);
  const query = `scope=${sample.scope}`;
  return <main className={styles.page}>
    <header className={styles.topbar}><Link className={styles.brand} href="/career">MOOA <b>CAREER</b></Link><span>AI DEEP INTERPRETATION</span><Link className={styles.back} href={`/career/ai/sample?${query}`}><ArrowLeft />1페이지 요약</Link></header>
    <section className={styles.intro}><p>AI DEEP INTERPRETATION</p><h1>{sample.reportTitle.replace(" 리포트", " 결과를")}<br /><em>경험의 언어</em>로 바꾸는 방식</h1><p className={styles.description}>결과의 세 축을 실제 경험·지원 공고와 연결해 읽습니다. 점수는 직업을 확정하는 답이 아니라, 비교할 활동과 환경을 찾는 출발점입니다.</p></section>
    <section className={styles.reportCover}><div><small>CAREER PROFILE</small><h2>{sample.reportTitle}</h2><p>{sample.intro}</p></div><div className={styles.coverCode}><span>{sample.scope === "combined" ? "COMBINED" : "ASSESSMENT"}</span><b>{sample.code}</b><small>DEEP INTERPRETATION</small></div></section>
    <section className={styles.axes} aria-label="상위 결과 축">{sample.axes.map((axis, index) => <article key={axis.label}><small>0{index + 1}</small><b>{axis.label}</b><span>{axis.description}</span></article>)}</section>
    <section className={styles.reportGrid}><div className={styles.mainColumn}>
      <article className={styles.summaryCard}><div className={styles.cardLabel}><Compass />01 · 해설 요약</div><h2>“{sample.headline}”라는 경향을 경험에서 확인합니다.</h2><p>{sample.strengthGuide} 이는 특정 직업의 적합 판정이 아니라, 내가 해 본 일과 지원할 환경을 비교할 때 쓸 수 있는 가설입니다.</p></article>
      <article className={styles.evidenceCard}><div className={styles.cardLabel}><FileText />02 · 경험에서 확인할 근거</div><h2>점수 대신, 이미 해 본 일을 대조합니다.</h2><ul>{sample.axes.map((axis) => <li key={axis.label}><CheckCircle2 /><span><b>{axis.label}</b>{axis.description}와 연결되는 실제 경험이 있었나요?</span></li>)}</ul></article>
    </div><aside className={styles.sideColumn}><article><div className={styles.cardLabel}><Target />03 · 공고를 읽는 기준</div><p>직무명이 아니라 실제 업무 내용을 확인합니다.</p><ol>{sample.applicationChecks.map((check) => <li key={check}>{check}</li>)}</ol></article><article><div className={styles.cardLabel}><BriefcaseBusiness />04 · 다음 질문</div><p>실제 해설에서는 이 질문에 답한 뒤, 지원서에 쓸 경험을 함께 좁힙니다.</p><Link href="/onboarding">지원서 경험 정리하기 <ArrowRight /></Link></article></aside></section>
    <section className={styles.process}><div><small>ACTUAL REPORT FLOW</small><h2>실제 심층해설은<br />이 순서로 완성됩니다.</h2></div><ol><li><i>01</i><span><b>검사 결과 선택</b>개별 결과 또는 세 검사 종합을 선택</span></li><li><i>02</i><span><b>경험·지원 자료 추가</b>사용자가 직접 제공한 이력서·자소서·공고만 사용</span></li><li><i>03</i><span><b>해설과 확인 질문</b>근거, 추가 질문, 지원서 연결 기준을 함께 제시</span></li></ol></section>
    <section className={styles.boundary}><ShieldCheck /><p>실제 서비스에서도 AI는 채용 결과·합격 가능성·직업 적합성을 판정하거나 예측하지 않습니다. 사용자가 제공한 자료와 검사 결과를 구분해, 확인할 질문과 다음 행동을 정리하는 보조 도구로만 사용합니다.</p></section>
    <footer className={styles.footer}><span>© MOOA Resume · AI 심층해설</span><div><Link href={`/career/ai/sample?${query}`}><ArrowLeft />1페이지 요약</Link><Link href={`/career/ai?scope=${sample.scope}`}>해설 선택 화면으로 <ArrowRight /></Link></div></footer>
  </main>;
}