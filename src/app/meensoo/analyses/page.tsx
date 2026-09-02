import Link from "next/link";
import { listAnalyses, type AdminAnalysis, type AdminAnalysisAttempt } from "@/server/admin/admin-repository";
import { readModelPricingFromEnv, RISK_LABEL, type RunCostRisk } from "@/domain/analysis-cost";
import styles from "../admin.module.css";
import { MODE_LABEL, kst } from "../format";
import { Pill } from "../pill";

export const dynamic = "force-dynamic";

/**
 * 첨삭 목록에 원가를 붙였습니다.
 *
 * 토큰 수만 있을 때는 "많이 썼다"까지만 알 수 있었습니다. 그 숫자가 4,900원짜리
 * 상품에서 얼마를 먹었는지는 매번 암산해야 했고, **실패한 시도의 몫은 아예
 * 빠져 있었습니다** — 검증에서 걸려 버려진 응답도 요금은 그대로 나갔는데도요.
 * 시도별 원장을 합쳐 한 건의 실제 원가와 마진을 그대로 적습니다.
 */

const OUTCOME_LABEL: Record<string, string> = {
  COMPLETED: "완료",
  VALIDATION_FAILED: "검증 실패",
  QUESTION_MISSING: "문항 누락",
  PROVIDER_FAILED: "제공자 오류",
  ERROR: "오류",
};

const RISK_TONE: Record<RunCostRisk, string> = {
  OK: styles.pillOk,
  THIN: styles.pillWarn,
  LOSS: styles.pillBad,
  FREE_HEAVY: styles.pillWarn,
  UNKNOWN: styles.pillMuted,
};

function won(value: number | null): string {
  if (value === null) return "—";
  // 원 단위 아래는 버립니다. 소수점이 붙으면 합계가 맞는지 눈으로 못 셉니다.
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function tokens(value: number | null): string {
  if (value === null) return "—";
  return value >= 1_000 ? `${(value / 1_000).toFixed(1)}k` : String(value);
}

/** 시도 한 줄씩. 몇 번째에서 무엇이 걸렸는지가 여기서만 보입니다. */
function AttemptList({ attempts }: { attempts: AdminAnalysisAttempt[] }) {
  if (attempts.length === 0) return <span className={styles.mono}>기록 없음</span>;
  return (
    <ul className={styles.attemptList}>
      {attempts.map((attempt, index) => (
        <li key={`${attempt.createdAt}-${index}`} data-wasted={attempt.outcome !== "COMPLETED"}>
          <b>{index + 1}</b>
          <span>{OUTCOME_LABEL[attempt.outcome] ?? attempt.outcome}</span>
          <em>{tokens((attempt.inputTokens ?? 0) + (attempt.outputTokens ?? 0))}</em>
          <small>{attempt.source === "CRON" ? "스케줄러" : "브라우저"}</small>
        </li>
      ))}
    </ul>
  );
}

function CostCell({ analysis }: { analysis: AdminAnalysis }) {
  const { cost } = analysis;
  return (
    <div className={styles.costCell}>
      <strong>{won(cost.costKrw)}</strong>
      <span className={`${styles.pill} ${RISK_TONE[cost.risk]}`}>{RISK_LABEL[cost.risk]}</span>
      {analysis.paid ? (
        <small>
          판매 {cost.priceKrw.toLocaleString("ko-KR")}원 · 남음 {won(cost.marginKrw)}
          {cost.marginRate !== null && ` (${Math.round(cost.marginRate * 100)}%)`}
        </small>
      ) : (
        <small>무료 이용권 · 판매액 없음</small>
      )}
    </div>
  );
}

/**
 * 확인이 필요한 건만 따로.
 *
 * 원가는 표의 오른쪽 끝에 있어서, 휴대폰에서는 옆으로 밀어야 보입니다.
 * 그런데 정작 급한 것은 "이 중 어느 건이 문제인가"이고, 그건 표를 다 훑어야
 * 알 수 있었습니다. 손해가 난 건만 위로 올려 스크롤 없이 보이게 합니다 —
 * 문제가 없으면 이 자리는 아예 나오지 않습니다.
 */
function AttentionList({ items }: { items: AdminAnalysis[] }) {
  if (items.length === 0) return null;
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>확인 필요</h2>
        <small>{items.length}건</small>
      </div>
      <ul className={styles.riskList}>
        {items.map((analysis) => (
          <li key={analysis.id}>
            <div className={styles.riskTop}>
              <span className={`${styles.pill} ${RISK_TONE[analysis.cost.risk]}`}>{RISK_LABEL[analysis.cost.risk]}</span>
              <b>{won(analysis.cost.costKrw)}</b>
              <small>
                {analysis.paid
                  ? `판매 ${analysis.cost.priceKrw.toLocaleString("ko-KR")}원 · 남음 ${won(analysis.cost.marginKrw)}`
                  : "무료 이용권"}
              </small>
            </div>
            <div className={styles.riskWho}>
              {analysis.email} · {analysis.companyName || analysis.caseTitle || "회사 미기재"}
            </div>
            <div className={styles.riskWhy}>
              시도 {analysis.cost.attempts}회
              {analysis.cost.wastedAttempts > 0 && ` · 버려진 시도 ${analysis.cost.wastedAttempts}회`}
              {analysis.cost.totalTokens !== null && ` · ${analysis.cost.totalTokens.toLocaleString("ko-KR")} 토큰`}
              {analysis.hasResult && <Link href={`/meensoo/analyses/${analysis.id}`}>결과 보기</Link>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function AnalysesPage() {
  const analyses = await listAnalyses(200);
  const stuck = analyses.filter((analysis) => analysis.status === "PENDING" || analysis.status === "RUNNING");
  const failed = analyses.filter((analysis) => analysis.status === "FAILED");

  const pricingConfigured = readModelPricingFromEnv() !== null;

  // 합계는 아는 것만 더합니다. 원장이 없는 옛 건을 0원으로 세면 총액이
  // 실제보다 낮게 나오고, 그 숫자로 판단하면 계속 틀립니다.
  const priced = analyses.filter((analysis) => analysis.cost.costKrw !== null);
  const totalCost = priced.reduce((sum, analysis) => sum + (analysis.cost.costKrw ?? 0), 0);
  const wastedAttempts = analyses.reduce((sum, analysis) => sum + analysis.cost.wastedAttempts, 0);
  const attention = analyses.filter((analysis) => ["LOSS", "THIN", "FREE_HEAVY"].includes(analysis.cost.risk));

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
        <div className={styles.card}>
          <span>API 원가 합계</span>
          <strong>{pricingConfigured ? won(totalCost) : "단가 미설정"}</strong>
          <small>{priced.length}건 기준 · 버려진 시도 {wastedAttempts}회 포함</small>
        </div>
        <div className={styles.card}>
          <span>확인 필요</span>
          <strong>{attention.length}건</strong>
          <small>원가 초과 · 마진 얇음 · 무료 과다</small>
        </div>
      </div>

      {!pricingConfigured && (
        <p className={styles.hint}>
          원가를 계산하려면 <code>OPENAI_PRICE_INPUT_PER_1M</code>과 <code>OPENAI_PRICE_OUTPUT_PER_1M</code>
          (100만 토큰당 USD)을 환경변수에 넣어 주세요. 환율은 <code>USD_KRW_RATE</code>로 바꿀 수 있고,
          없으면 1,400원으로 계산합니다. 단가가 없으면 토큰 수만 보여 주고 금액은 만들어 내지 않습니다.
        </p>
      )}

      <AttentionList items={attention} />

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
                  <th>상태</th><th>완료</th><th>모델 · 프롬프트</th>
                  <th>시도 내역</th><th>원가 · 마진</th><th></th>
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
                    <td><AttemptList attempts={analysis.attempts} /></td>
                    <td><CostCell analysis={analysis} /></td>
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
