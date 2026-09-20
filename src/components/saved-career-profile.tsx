"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Cloud, ShieldCheck } from "lucide-react";
import { WORK_STYLE_DIMENSION_LABELS, restoreWorkStyleScores, type WorkStyleDimension } from "@/domain/career-assessment";
import { INTEREST_DIMENSIONS } from "@/domain/career-interest";
import { WORK_VALUE_DIMENSIONS } from "@/domain/career-work-values";
import { classifyWorkStyleType, workStyleTypeCode } from "@/domain/work-style-type";
import { CareerAiReportHistory } from "./career-ai-report-history";
import styles from "./work-style-assessment.module.css";
import cardStyles from "./saved-career-profile.module.css";

type StoredAssessment = { sessionId: string; assessmentCode: "work_style" | "interest" | "work_values"; completedAt: string; scores: { code: string; score: number }[] };

const labels = { work_style: "업무성향", interest: "직업흥미", work_values: "직업가치" } as const;
const resultHref = { work_style: "/career/work-style/result", interest: "/career/interest/result", work_values: "/career/values/result" } as const;
const order = ["interest", "work_style", "work_values"] as const;

function dimensionLabel(item: StoredAssessment, code: string): string {
  if (item.assessmentCode === "work_style") return WORK_STYLE_DIMENSION_LABELS[code as WorkStyleDimension] ?? code;
  const dimensions: readonly { id: string; label: string }[] = item.assessmentCode === "interest" ? INTEREST_DIMENSIONS : WORK_VALUE_DIMENSIONS;
  return dimensions.find((dimension) => dimension.id === code)?.label ?? code;
}

function headline(item: StoredAssessment): string {
  if (item.assessmentCode === "work_style") {
    const restored = restoreWorkStyleScores(item.scores);
    if (restored) {
      const { primary } = classifyWorkStyleType(restored);
      return `${workStyleTypeCode(primary)} · ${primary.name}`;
    }
  }
  const top = [...item.scores].sort((a, b) => b.score - a.score).slice(0, 3).map((score) => dimensionLabel(item, score.code));
  return top.length ? `상위 ${top.join(" · ")}` : "저장된 결과";
}

/** 계정에 저장된 검사 결과와 AI 심층해설 기록을 한곳에서 다시 여는 화면. */
export function SavedCareerProfile() {
  const [items, setItems] = useState<StoredAssessment[]>([]);
  const [message, setMessage] = useState("저장된 결과를 불러오고 있어요.");
  const [failed, setFailed] = useState(false);

  async function load() {
    setFailed(false);
    try {
      const response = await fetch("/api/career-assessments/latest", { cache: "no-store" });
      const body = await response.json() as { assessments?: StoredAssessment[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "불러오기에 실패했습니다.");
      const assessments = body.assessments ?? [];
      setItems(assessments);
      setMessage(assessments.length ? "가장 최근에 저장한 검사 결과입니다. 카드를 누르면 결과를 볼 수 있어요." : "계정에 저장된 검사 결과가 아직 없어요.");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "불러오기에 실패했습니다.");
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const sorted = [...items].sort((a, b) => order.indexOf(a.assessmentCode) - order.indexOf(b.assessmentCode));

  return <main className={styles.result}>
    <div className={styles.resultHero}><span><Cloud />SAVED CAREER PROFILE</span><h1>계정에 저장된<br />커리어 탐색 결과</h1><p>{message}</p></div>
    {failed ? <p style={{ textAlign: "center" }}><button type="button" onClick={() => void load()} style={{ border: 0, background: "transparent", color: "#176b4a", fontWeight: 800, cursor: "pointer" }}>다시 불러오기</button></p> : null}
    {sorted.length > 0 ? <section className={cardStyles.grid}>{sorted.map((item) => {
      const top = [...item.scores].sort((a, b) => b.score - a.score).slice(0, 5);
      return <Link key={item.sessionId} href={resultHref[item.assessmentCode]} className={cardStyles.card}>
        <div className={cardStyles.head}><span>{labels[item.assessmentCode]}</span><small>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(item.completedAt))} 저장</small></div>
        <strong>{headline(item)}</strong>
        <ul>{top.map((score) => <li key={score.code}><span>{dimensionLabel(item, score.code)}</span><i><b style={{ width: `${Math.max(0, Math.min(100, score.score))}%` }} /></i><em>{Math.round(score.score)}</em></li>)}</ul>
        <span className={cardStyles.open}>결과 보기 <ArrowRight /></span>
      </Link>;
    })}</section> : null}
    <CareerAiReportHistory showEmpty />
    <section className={styles.disclaimer}><ShieldCheck /><p><b>내 계정에서만 볼 수 있습니다.</b> 저장된 응답은 다른 사용자에게 공개되지 않습니다. AI 해설은 사용자가 자료를 선택하고 직접 실행하기 전에는 호출되지 않습니다.</p></section>
  </main>;
}
