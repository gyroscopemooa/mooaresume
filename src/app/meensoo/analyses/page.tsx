import Link from "next/link";
import { listAnalyses } from "@/server/admin/admin-repository";
import styles from "../admin.module.css";
import { MODE_LABEL, kst } from "../format";
import { Pill } from "../pill";

export const dynamic = "force-dynamic";

export default async function AnalysesPage() {
  const analyses = await listAnalyses(200);
  const stuck = analyses.filter((analysis) => analysis.status === "PENDING" || analysis.status === "RUNNING");
  const failed = analyses.filter((analysis) => analysis.status === "FAILED");

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>첨삭 결과</h1>
          <p>신청자별 첨삭 실행 기록입니다. 완료된 건은 결과를 그대로 볼 수 있습니다. 최근 200건.</p>
        </div>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}><span>완료</span><strong>{analyses.filter((analysis) => analysis.status === "COMPLETED").length}건</strong></div>
        <div className={styles.card}>
          <span>진행 중 · 대기</span>
          <strong>{stuck.length}건</strong>
          <small>몇 분 넘게 남아 있으면 멈춘 것입니다</small>
        </div>
        <div className={styles.card}>
          <span>실패</span>
          <strong>{failed.length}건</strong>
          <small>실패 코드는 표에서 확인</small>
        </div>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>전체 첨삭</h2>
          <small>{analyses.length}건</small>
        </div>
        {analyses.length === 0 ? (
          <p className={styles.empty}>아직 첨삭 기록이 없습니다.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>시작</th><th>신청자</th><th>회사</th><th>상품 · 단계</th>
                  <th>상태</th><th>완료</th><th>모델 · 프롬프트</th><th>토큰</th><th></th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((analysis) => (
                  <tr key={analysis.id}>
                    <td>{kst(analysis.createdAt)}</td>
                    <td>{analysis.email}</td>
                    <td>{analysis.companyName || analysis.caseTitle || "—"}</td>
                    <td>{analysis.product} · {MODE_LABEL[analysis.writingMode] ?? analysis.writingMode}</td>
                    <td>
                      <Pill status={analysis.status} />
                      {analysis.failureCode && <div className={styles.mono}>{analysis.failureCode}</div>}
                      {analysis.attemptCount > 0 && <div className={styles.mono}>시도 {analysis.attemptCount + 1}회</div>}
                    </td>
                    <td>{kst(analysis.completedAt)}</td>
                    <td className={styles.mono}>{analysis.model ?? "—"}<br />{analysis.promptVersion ?? ""}</td>
                    <td className={styles.mono}>{analysis.totalTokens?.toLocaleString("ko-KR") ?? "—"}</td>
                    <td>{analysis.hasResult && <Link href={`/meensoo/analyses/${analysis.id}`}>결과 보기</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
