"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import styles from "./career-assessment-lab.module.css";

const assessments = [
  { id: "interest", number: "01", code: "RIASEC", title: "직업흥미 탐색", detail: "어떤 활동과 문제 해결에 자연스럽게 끌리는지", meta: "30 QUESTIONS · 5 MIN · BETA", href: "/career/interest", accent: "I / R / S" },
  { id: "style", number: "02", code: "OCEAN", title: "업무성향 분석", detail: "일을 대하는 방식과 선호 업무환경을 살펴보기", meta: "50 QUESTIONS · 8 MIN", href: "/career/work-style", accent: "O · C · E · A · N" },
  { id: "values", number: "03", code: "VALUES", title: "직업가치 탐색", detail: "일에서 포기하기 어려운 조건의 우선순위", meta: "18 QUESTIONS · 4 MIN · BETA", href: "/career/values", accent: "A / I / R" },
] as const;

type View = "index" | "sheet" | "report";

export function CareerAssessmentLab() {
  const [selectedId, setSelectedId] = useState<(typeof assessments)[number]["id"]>("interest");
  const [view, setView] = useState<View>("index");
  const selected = assessments.find((assessment) => assessment.id === selectedId) ?? assessments[0];

  return <main className={styles.lab}>
    <header className={styles.header}><Link href="/career" className={styles.wordmark}>MOOA <span>/</span> ASSESSMENT LAB</Link><p>DESIGN STUDY · V2</p></header>
    <div className={styles.utility}><span>01–03</span><nav aria-label="디자인 시안 보기">{(["index", "sheet", "report"] as const).map((item) => <button key={item} type="button" onClick={() => setView(item)} className={view === item ? styles.activeView : ""}>{item === "index" ? "INDEX" : item === "sheet" ? "SHEET" : "REPORT"}</button>)}</nav></div>

    {view === "index" && <section className={styles.index}>
      <aside className={styles.indexNav}><p>ASSESSMENTS<br />/ 03</p>{assessments.map((assessment) => <button key={assessment.id} type="button" onClick={() => setSelectedId(assessment.id)} className={selected.id === assessment.id ? styles.selected : ""}><span>{assessment.number}</span><b>{assessment.code}</b><i>{assessment.id === "style" ? "AVAILABLE" : "BETA"}</i></button>)}</aside>
      <article className={styles.poster}>
        <p>{selected.number} / CAREER ASSESSMENT</p><div className={styles.posterCode} aria-hidden="true">{selected.accent}</div><h1>{selected.title}</h1><p className={styles.posterDetail}>{selected.detail}</p><div className={styles.posterFooter}><span>{selected.meta}</span><Link href={selected.href}>검사 시작 <ArrowUpRight /></Link></div>
      </article>
    </section>}

    {view === "sheet" && <section className={styles.sheet}>
      <div className={styles.sheetHead}><span>{selected.code} / {selected.title}</span><b>07 / {selected.id === "style" ? "50" : selected.id === "interest" ? "30" : "18"}</b></div><div className={styles.progress}><i style={{ width: "23%" }} /></div>
      <p className={styles.sheetKicker}>SECTION 02 · WORK &amp; ACTIVITY</p><h1>기계가 어떻게 작동하는지<br />원리를 알아보는 활동을 좋아한다.</h1><fieldset className={styles.scale}><legend>응답 선택</legend><span>전혀 그렇지 않다</span><div>{[1, 2, 3, 4, 5].map((number) => <button type="button" key={number} aria-label={`${number}점`} className={number === 4 ? styles.marked : ""}><b>{number}</b><i /></button>)}</div><span>매우 그렇다</span></fieldset><footer className={styles.sheetFooter}><button type="button"><ChevronLeft /> 이전</button><span>응답은 이 브라우저에만 임시 저장됩니다.</span><button type="button" onClick={() => setView("report")}>다음 <ChevronRight /></button></footer>
    </section>}

    {view === "report" && <section className={styles.report}>
      <div className={styles.reportCover}><p>YOUR<br />CAREER<br />PROFILE</p><div><strong>I</strong><b>87</b><span>INVESTIGATIVE</span></div><small>RIASEC / 2026.08.27 · DEMO DATA</small></div>
      <section className={styles.reportIntro}><p>01 / AT A GLANCE</p><h1>생각하고 이해한 것을<br /><em>현실의 문제</em>와 연결할 때<br />몰입할 가능성이 높아요.</h1><span>이 시안의 문장은 예시입니다. 실제 결과는 응답을 바탕으로 계산됩니다.</span></section>
      <section className={styles.axes}><p>02 / LEADING DIMENSIONS</p>{[["I", "탐구", "87", "자료에서 원인과 구조를 찾는 활동"], ["S", "사회", "76", "사람이 이해하고 성장하도록 돕는 활동"], ["R", "현실", "68", "도구·기술·현장의 구체적인 문제 해결"]].map(([code, label, score, note]) => <article key={code}><b>{code}</b><h2>{label}</h2><strong>{score}</strong><p>{note}</p></article>)}</section>
      <section className={styles.application}><div><p>06 / APPLY TO YOUR APPLICATION</p><h2>점수는 답이 아니라<br />경험을 고르는 단서입니다.</h2><p>문제의 원인을 찾고, 다른 사람에게 설명하고, 실제 개선으로 연결했던 경험을 떠올려 보세요.</p></div><Link href="/onboarding">내 자소서의 경험과 연결하기 <ArrowUpRight /></Link></section>
    </section>}
    <p className={styles.note}>이 화면은 기존 검사·채점·결과 경로를 바꾸지 않는 디자인 비교 시안입니다.</p>
  </main>;
}
