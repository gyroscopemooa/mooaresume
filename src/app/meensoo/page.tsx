import Link from "next/link";
import { getSummary, listAnalyses, listPurchases } from "@/server/admin/admin-repository";
import styles from "./admin.module.css";
import { MODE_LABEL, krw, kst, revenueKind, shortId } from "./format";
import { Pill } from "./pill";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [summary, purchases, analyses] = await Promise.all([
    getSummary(),
    listPurchases(8),
    listAnalyses(8),
  ]);

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>대시보드</h1>
          <p>결제, 첨삭, 메일 현황을 한 화면에서 봅니다.</p>
        </div>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}>
          <span>실매출</span>
          <strong>{krw(summary.revenueKrw)}</strong>
          <small>실제 결제 {summary.realOrders}건 · 테스트·무료 제외</small>
        </div>
        {/* 실매출 바로 옆입니다. 매출만 있고 원가가 없으면 절반짜리
            대시보드입니다 — 무료 이용권도 API 요금은 그대로 나가므로 여기
            원가에는 포함되지만 위 실매출에는 없습니다. */}
        <div className={styles.card}>
          <span>API 원가 (전체 기간)</span>
          <strong>{summary.totalCostKrw !== null ? krw(Math.round(summary.totalCostKrw)) : "단가 미설정"}</strong>
          {summary.totalCostKrw !== null ? (
            <small>
              실매출 대비 마진 {krw(Math.round(summary.revenueKrw - summary.totalCostKrw))}
              {summary.revenueKrw > 0 && ` (${Math.round(((summary.revenueKrw - summary.totalCostKrw) / summary.revenueKrw) * 100)}%)`}
              {summary.wastedAttempts > 0 && ` · 버려진 시도 ${summary.wastedAttempts}건 포함`}
            </small>
          ) : (
            <small>OPENAI_PRICE_INPUT_PER_1M 등 환경변수 필요</small>
          )}
        </div>
        <div className={styles.card}>
          <span>매출로 세지 않은 결제</span>
          <strong>{summary.freeOrders + summary.sandboxOrders + summary.unknownOrders}건</strong>
          {/* Named separately because they fail for different reasons: a free
              order took no money, a sandbox order was never money, and an
              unmarked one predates the marker and cannot be told apart. */}
          <small>무료 {summary.freeOrders}건 · 샌드박스 {summary.sandboxOrders}건 · 구분 전 {summary.unknownOrders}건</small>
        </div>
        <div className={styles.card}>
          <span>전체 결제 기록</span>
          <strong>{summary.paidOrders}건</strong>
          <small>환불 {summary.refundedOrders}건</small>
        </div>
        <div className={styles.card}>
          <span>첨삭 완료</span>
          <strong>{summary.analysesCompleted}건</strong>
          <small>전체 {summary.analysesTotal}건</small>
        </div>
        <div className={styles.card}>
          <span>진행 중 / 실패</span>
          <strong>{summary.analysesInFlight} / {summary.analysesFailed}</strong>
          <small>진행 중이 오래 남아 있으면 확인이 필요합니다</small>
        </div>
        <div className={styles.card}>
          <span>메일 (7일)</span>
          <strong>{summary.mailSent7d}건</strong>
          <small>실패 {summary.mailFailed7d}건</small>
        </div>
        <div className={styles.card}>
          <span>새 문의 / 사전 신청</span>
          <strong>{summary.newInquiries} / {summary.waitlist}</strong>
          <small>답변하지 않은 문의 수</small>
        </div>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>최근 구매</h2>
          <Link href="/meensoo/purchases" className={styles.mono}>전체 보기 →</Link>
        </div>
        {purchases.length === 0 ? (
          <p className={styles.empty}>아직 구매 기록이 없습니다.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr><th>결제 시각</th><th>구매자</th><th>상품</th><th>금액</th><th>구분</th><th>상태</th><th>지원서</th></tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td>{kst(purchase.paidAt)}</td>
                    <td>{purchase.email}</td>
                    <td>{purchase.product}</td>
                    <td>{krw(purchase.amount)}</td>
                    <td><Pill status={revenueKind(purchase)} /></td>
                    <td><Pill status={purchase.status} /></td>
                    <td>{purchase.companyName || purchase.caseTitle || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>최근 첨삭</h2>
          <Link href="/meensoo/analyses" className={styles.mono}>전체 보기 →</Link>
        </div>
        {analyses.length === 0 ? (
          <p className={styles.empty}>아직 첨삭 기록이 없습니다.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr><th>시작</th><th>신청자</th><th>상품 · 단계</th><th>상태</th><th>결과</th></tr>
              </thead>
              <tbody>
                {analyses.map((analysis) => (
                  <tr key={analysis.id}>
                    <td>{kst(analysis.createdAt)}</td>
                    <td>{analysis.email}</td>
                    <td>{analysis.product} · {MODE_LABEL[analysis.writingMode] ?? analysis.writingMode}</td>
                    <td>
                      <Pill status={analysis.status} />
                      {analysis.failureCode && <div className={styles.mono}>{analysis.failureCode}</div>}
                    </td>
                    <td>{analysis.hasResult ? <Link href={`/meensoo/analyses/${analysis.id}`}>결과 보기</Link> : <span className={styles.mono}>{shortId(analysis.id)}</span>}</td>
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
