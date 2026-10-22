import Link from "next/link";
import { isAdmin } from "@/server/admin/admin-session";
import { serviceClient } from "@/server/admin/admin-repository";
import { listAdminAnalysisPreviews } from "@/server/admin/admin-analysis-previews";
import { verificationEvidenceSchema } from "@/server/second-review/automatic-contract";
import { listExtraReviewSends } from "@/server/second-review/extra-review-admin";
import { ExtraReviewSend } from "./extra-review-send";
import styles from "./admin-extra-review.module.css";

const STATUS: Record<string, string> = {
  completed: "자동 검증 통과", needs_attention: "자동 생성 중단 · 확인 필요",
};
const kst = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** 첨삭 상세 맨 위의 추가 첨삭 칸: 최신본 보기 · 미리 보내기 · 고객 발송 · 발송 기록을 한곳에. */
export async function AdminExtraReviewPanel({ runId, ownerEmail }: { runId: string; ownerEmail: string }) {
  if (!(await isAdmin())) return null;
  const [previews, job, sends] = await Promise.all([
    listAdminAnalysisPreviews(runId).catch(() => []),
    serviceClient().from("automatic_second_reviews").select("status,failure_code,verification").eq("analysis_run_id", runId).maybeSingle(),
    listExtraReviewSends(runId),
  ]);
  const latest = previews[0];
  const status = job.data ? STATUS[job.data.status] ?? "자동 생성 진행 중" : "자동 생성 대상 아님";
  const evidence = verificationEvidenceSchema.safeParse(job.data?.verification);
  const owner = ownerEmail.toLowerCase();
  const toOwner = sends.filter(send => send.ok && send.recipient.toLowerCase() === owner);

  return <section className={styles.panel} id="extra-review">
    <header>
      <h2>추가 첨삭</h2>
      <span>{status}{job.data?.failure_code ? ` · ${job.data.failure_code}` : ""}</span>
      {toOwner.length > 0 ? <span className={styles.sent}>고객 발송 {toOwner.length}회 · 최근 {kst(toOwner[0].sentAt)}</span> : <span>고객 미발송</span>}
    </header>
    {latest ? <>
      <div className={styles.latest}>
        <strong>{latest.title}</strong>
        <small>{kst(latest.createdAt)}</small>
        <Link href={`/meensoo/analyses/${runId}/second-review/${latest.id}`}>추가 첨삭본 보기 →</Link>
      </div>
      <ExtraReviewSend runId={runId} previewId={latest.id} ownerEmail={ownerEmail} sentToOwner={toOwner.filter(send => send.previewId === latest.id).length} />
    </> : <p className={styles.empty}>아직 만들어진 추가 첨삭본이 없습니다.</p>}
    {sends.length > 0 && <details>
      <summary>발송 기록 {sends.length}건</summary>
      <ul>{sends.map(send => <li key={`${send.sentAt}-${send.recipient}`}>{kst(send.sentAt)} · {send.recipient}{send.recipient.toLowerCase() === owner ? " (고객)" : ""}{send.ok ? "" : " · 실패"}{send.previewId && send.previewId !== latest?.id ? " · 이전 본" : ""}</li>)}</ul>
    </details>}
    {previews.length > 1 && <details>
      <summary>이전 추가 첨삭본 {previews.length - 1}개</summary>
      <ul>{previews.slice(1).map(preview => <li key={preview.id}><Link href={`/meensoo/analyses/${runId}/second-review/${preview.id}`}>{kst(preview.createdAt)} · {preview.title}</Link></li>)}</ul>
    </details>}
    {evidence.success && <details>
      <summary>자동 검증 근거</summary>
      <ul>{evidence.data.answers.map(answer => <li key={answer.order}>{answer.order}. {answer.reason}</li>)}{evidence.data.remainingIssues.map((issue, index) => <li key={`issue-${index}`}>확인 필요: {issue}</li>)}</ul>
    </details>}
  </section>;
}
