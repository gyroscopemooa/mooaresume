"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cloud, RefreshCw, ShieldCheck } from "lucide-react";
import styles from "./work-style-assessment.module.css";

type StoredAssessment = { sessionId: string; assessmentCode: "work_style" | "interest" | "work_values"; completedAt: string; scores: { code: string; score: number }[] };
const labels = { work_style: "업무성향", interest: "직업흥미", work_values: "직업가치" } as const;

export function SavedCareerProfile() {
  const [items, setItems] = useState<StoredAssessment[]>([]);
  const [message, setMessage] = useState("저장된 결과를 불러오고 있어요.");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/career-assessments/latest", { cache: "no-store" });
      const body = await response.json() as { assessments?: StoredAssessment[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "불러오기에 실패했습니다.");
      const assessments = body.assessments ?? [];
      setItems(assessments);
      setMessage(assessments.length ? "가장 최근에 저장한 검사 결과입니다." : "계정에 저장된 검사 결과가 아직 없어요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "불러오기에 실패했습니다.");
    } finally { setLoading(false); }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return <main className={styles.result}>
    <div className={styles.resultHero}><span><Cloud />SAVED CAREER PROFILE</span><h1>계정에 저장된<br />커리어 탐색 결과</h1><p>{message}</p></div>
    {items.length > 0 ? <section className={styles.scoreGrid} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>{items.map((item) => <article key={item.sessionId}><div><span>{labels[item.assessmentCode]}</span><b>저장됨</b></div><strong>{item.scores.length}</strong><p>핵심 영역 점수 {item.scores.length}개를 {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(item.completedAt))}에 저장했습니다.</p><Link href="/career/profile">현재 브라우저 결과 보기</Link></article>)}</section> : <section className={styles.empty}><Cloud /><h1>{loading ? "불러오는 중" : "아직 저장된 결과가 없어요"}</h1><p>검사를 완료한 뒤, 결과 보관 화면에서 내 계정에 저장할 수 있습니다.</p><Link href="/career">커리어 탐색 시작</Link></section>}
    <section className={styles.disclaimer}><ShieldCheck /><p><b>내 계정에서만 볼 수 있습니다.</b> 저장된 응답은 다른 사용자에게 공개되지 않습니다. AI 해설은 사용자가 자료를 선택하고 직접 실행하기 전에는 호출되지 않습니다.</p></section>
    <p style={{ textAlign: "center", marginTop: 18 }}><button type="button" onClick={() => void load()} disabled={loading} style={{ border: 0, background: "transparent", color: "#176b4a", fontWeight: 800, cursor: "pointer" }}><RefreshCw size={14} /> 다시 불러오기</button></p>
  </main>;
}
