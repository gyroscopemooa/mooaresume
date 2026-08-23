import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnalysis } from "@/server/admin/admin-repository";
import styles from "../../admin.module.css";
import { MODE_LABEL, kst } from "../../format";
import { Pill } from "../../pill";

export const dynamic = "force-dynamic";

type ResultQuestion = {
  id?: string;
  order?: number;
  title?: string;
  subheading?: string;
  originalAnswer?: string;
  revisedAnswer?: string;
  revisionReasons?: string[];
};

/**
 * Read loosely rather than through `resultDocumentSchema`.
 *
 * A record written by an older prompt version must still be openable here —
 * this screen exists to inspect results, and refusing to render the ones that
 * no longer validate would hide exactly the cases worth looking at. Anything
 * unreadable falls through to the raw JSON below.
 */
function readQuestions(data: unknown): ResultQuestion[] {
  if (!data || typeof data !== "object") return [];
  const questions = (data as { questions?: unknown }).questions;
  if (!Array.isArray(questions)) return [];
  return questions.filter((question): question is ResultQuestion => Boolean(question) && typeof question === "object");
}

export default async function AnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAnalysis(id);
  if (!detail) notFound();

  const { run, resultData } = detail;
  const questions = readQuestions(resultData);
  const readiness = (resultData as { readiness?: { score?: number; label?: string; summary?: string } } | null)?.readiness;

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>{run.companyName || run.caseTitle || "첨삭 결과"}</h1>
          <p>{run.email} · {run.product} · {MODE_LABEL[run.writingMode] ?? run.writingMode}</p>
        </div>
        <Link href="/meensoo/analyses" className={styles.mono}>← 목록으로</Link>
      </div>

      <section className={styles.panel}>
        <div className={styles.meta}>
          <div><span>상태</span><strong><Pill status={run.status} /></strong></div>
          <div><span>시작</span><strong>{kst(run.createdAt)}</strong></div>
          <div><span>완료</span><strong>{kst(run.completedAt)}</strong></div>
          <div><span>목표 분량</span><strong>{detail.targetLength ? `${detail.targetLength}자` : "—"}</strong></div>
          <div><span>모델</span><strong>{run.model ?? "—"}</strong></div>
          <div><span>프롬프트</span><strong>{run.promptVersion ?? "—"}</strong></div>
          <div><span>토큰</span><strong>{run.totalTokens?.toLocaleString("ko-KR") ?? "—"}</strong></div>
          <div><span>실행 ID</span><strong className={styles.mono}>{run.id}</strong></div>
        </div>
      </section>

      {readiness && (
        <section className={styles.panel}>
          <div className={styles.panelHead}><h2>준비도</h2><small>{readiness.score}점 · {readiness.label}</small></div>
          <div className={styles.question}><p className={styles.prose}>{readiness.summary}</p></div>
        </section>
      )}

      {questions.length > 0 && (
        <section className={styles.panel}>
          <div className={styles.panelHead}><h2>문항별 결과</h2><small>{questions.length}문항</small></div>
          {questions.map((question, index) => (
            <div key={question.id ?? index} className={styles.question}>
              <h3>{question.order ?? index + 1}. {question.title ?? "제목 없음"}</h3>
              {question.subheading && <p className={styles.mono}>소제목: {question.subheading}</p>}

              <h4>원문</h4>
              <p className={styles.prose}>{question.originalAnswer?.trim() || "(비어 있음)"}</p>

              <h4>첨삭본</h4>
              <p className={styles.prose}>{question.revisedAnswer?.trim() || "(없음)"}</p>

              {question.revisionReasons && question.revisionReasons.length > 0 && (
                <>
                  <h4>수정 이유</h4>
                  <p className={styles.prose}>{question.revisionReasons.map((reason) => `· ${reason}`).join("\n")}</p>
                </>
              )}
            </div>
          ))}
        </section>
      )}

      {run.failureCode && (
        <section className={styles.panel}>
          <div className={styles.panelHead}><h2>실패</h2></div>
          <div className={styles.question}><p className={styles.mono}>{run.failureCode}</p></div>
        </section>
      )}

      <section className={styles.panel}>
        {/* The structured view above covers the common shape; the raw record is
            what to read when a result looks wrong in a way the view hides. */}
        <details className={styles.details}>
          <summary>저장된 원본 JSON 보기</summary>
          <pre className={styles.raw}>{resultData ? JSON.stringify(resultData, null, 2) : "결과가 저장되지 않았습니다."}</pre>
        </details>
      </section>
    </>
  );
}
