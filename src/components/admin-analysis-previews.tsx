"use client";
import Link from "next/link";
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

  return <section className={styles.panel} id="secondary-review">
    <div className={styles.reviewHead}><div><span>CONSULTANT AI REVIEW</span><h2>추가 첨삭본</h2></div><strong>검토 초안 · 고객 미전달</strong></div>
    <p>완성된 AI 첨삭을 컨설턴트 관점에서 한 번 더 확인한 개선본입니다. 고객에게 전달된 기존 결과·결제·이용권은 바뀌지 않으며, 현재는 관리자만 볼 수 있습니다.</p>
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
      <div className={styles.savedHead}><div><span>SECOND REVIEW</span><h3>{preview.title}</h3></div><strong>{new Date(preview.createdAt).toLocaleString("ko-KR")} · 고객 미전달</strong></div>
      <Link href={`/meensoo/analyses/${runId}/second-review/${preview.id}`}>독립된 추가 첨삭 결과표로 보기 →</Link>
      {preview.revisedAnswers.map(answer => <div className={styles.question} key={answer.questionOrder}><h4>{answer.questionOrder}. {answer.section?.title ?? questions.find(q => q.order === answer.questionOrder)?.title}</h4><div className={styles.columns}><div><h5>고객 제공본</h5><p>{answer.section?.originalAnswer ?? questions.find(q => q.order === answer.questionOrder)?.delivered}</p></div><div><h5>관리자 개선본</h5><p>{answer.revisedAnswer}</p>{answer.section && <ul>{answer.section.revisionReasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}</div></div></div>)}
      {preview.notes && <aside className={styles.reviewNote}><b>컨설턴트 검토 메모</b><p>{preview.notes}</p></aside>}
    </article>)}
  </section>;
}
