"use client";
import { useState } from "react";
import type { AdminAnalysisPreview } from "@/domain/admin-analysis-preview";
import styles from "./admin-editing-experiments.module.css";

type Question = { order: number; title: string; delivered: string };

export function AdminAnalysisPreviews({ runId, questions }: { runId: string; questions: Question[] }) {
  const [previews, setPreviews] = useState<AdminAnalysisPreview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("관리자 개선본");
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>(() => Object.fromEntries(questions.map(q => [q.order, q.delivered])));

  async function refresh() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/meensoo/analysis-previews?runId=${encodeURIComponent(runId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPreviews(data.previews); setLoaded(true);
    } catch { setError("관리자 개선본 저장소를 조회하지 못했습니다."); }
    finally { setBusy(false); }
  }

  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/meensoo/analysis-previews", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisRunId: runId, title, notes, revisedAnswers: questions.map(q => ({ questionOrder: q.order, revisedAnswer: answers[q.order] ?? "" })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPreviews(current => [data.preview, ...current]); setLoaded(true);
    } catch { setError("개선본을 저장하지 못했습니다. 기존 고객 결과는 변경되지 않았습니다."); }
    finally { setBusy(false); }
  }

  return <section className={styles.panel}>
    <h2>관리자 전용 개선본</h2>
    <p>고객에게 전달된 결과·결제·이용권은 바뀌지 않습니다. 이 화면과 API는 관리자 인증에서만 접근할 수 있습니다.</p>
    <button type="button" disabled={busy} onClick={refresh}>개선본 기록 조회</button>
    {loaded && <div className={styles.experiment}>
      <label>이름<input value={title} maxLength={120} onChange={event => setTitle(event.target.value)} /></label>
      {questions.map(question => <div className={styles.question} key={question.order}>
        <h4>{question.order}. {question.title}</h4>
        <div className={styles.columns}><div><h5>고객에게 제공한 결과</h5><p>{question.delivered}</p></div><div><h5>새 관리자 개선본</h5><textarea rows={14} value={answers[question.order] ?? ""} onChange={event => setAnswers(current => ({ ...current, [question.order]: event.target.value }))} /></div></div>
      </div>)}
      <label>검토 메모<textarea rows={4} value={notes} maxLength={4000} onChange={event => setNotes(event.target.value)} /></label>
      <button type="button" disabled={busy || !title.trim() || questions.some(q => !(answers[q.order] ?? "").trim())} onClick={save}>관리자 개선본 저장</button>
    </div>}
    {error && <p role="alert">{error}</p>}
    {previews.map(preview => <article className={styles.experiment} key={preview.id}>
      <h3>{preview.title}</h3><p>{new Date(preview.createdAt).toLocaleString("ko-KR")} · 고객 미적용</p>
      {questions.map(question => <div className={styles.question} key={question.order}><h4>{question.order}. {question.title}</h4><div className={styles.columns}><div><h5>고객 제공본</h5><p>{question.delivered}</p></div><div><h5>관리자 개선본</h5><p>{preview.revisedAnswers.find(answer => answer.questionOrder === question.order)?.revisedAnswer}</p></div></div></div>)}
      {preview.notes && <p>{preview.notes}</p>}
    </article>)}
  </section>;
}
