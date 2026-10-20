import { isAdmin } from "@/server/admin/admin-session";
import { serviceClient } from "@/server/admin/admin-repository";
import { verificationSchema } from "@/server/second-review/automatic-contract";
import styles from "@/app/meensoo/admin.module.css";

export async function AdminAutomaticReview({ runId }: { runId: string }) {
  if (!(await isAdmin())) return null;
  const { data, error } = await serviceClient().from("automatic_second_reviews")
    .select("status,failure_code,verification,created_at,updated_at").eq("analysis_run_id",runId).maybeSingle();
  if (error || !data) return null;
  const verification = verificationSchema.safeParse(data.verification);
  const label = data.status === "completed" ? "자동 검증 통과 · 관리자 최종 확인 대기"
    : data.status === "needs_attention" ? "자동 검수 중단 · 관리자 확인 필요" : "자동 검수 진행 중";
  return <section className={styles.panel}>
    <div className={styles.panelHead}><h2>취업 컨설턴트 AI 검수</h2><small>{label}</small></div>
    <div className={styles.question}>
      <p>원자료와 1차 결과를 대조한 별도 검수입니다. 2차본은 자동 발송하지 않습니다.</p>
      {data.failure_code && <p className={styles.mono}>{data.failure_code}</p>}
      {verification.success && <details className={styles.details}>
        <summary>항목별 독립 검증 근거</summary>
        {verification.data.answers.map(answer => <p key={answer.order} className={styles.prose}>{answer.order}. {answer.reason}</p>)}
        {verification.data.remainingIssues.map((issue,index) => <p key={index} className={styles.prose}>확인 필요: {issue}</p>)}
      </details>}
    </div>
  </section>;
}
