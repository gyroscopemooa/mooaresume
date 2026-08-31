import { listRewardCredits } from "@/server/admin/admin-repository";
import { getSiteUrl } from "@/lib/site-url";
import { REWARD_REASON_LABEL, REWARD_STATUS_LABEL, buildClaimUrl, type RewardCreditReason, type RewardCreditStatus } from "@/domain/reward-credit";
import styles from "../admin.module.css";
import { kst } from "../format";
import { ClaimLinkCell } from "./claim-link-cell";
import { RewardIssuer } from "./reward-issuer";

// Pill maps its own labels from a table these statuses are not in, so the tone
// is chosen here rather than widening a component three other pages share.
const STATUS_TONE: Record<string, string> = {
  UNCLAIMED: styles.pillWarn,
  AVAILABLE: styles.pillOk,
  CONSUMED: styles.pillMuted,
  EXPIRED: styles.pillBad,
  REVOKED: styles.pillBad,
};

export const dynamic = "force-dynamic";

export default async function AdminRewardsPage() {
  const credits = await listRewardCredits(300);
  const siteUrl = getSiteUrl();
  const unclaimed = credits.filter((credit) => credit.status === "UNCLAIMED").length;
  const consumed = credits.filter((credit) => credit.status === "CONSUMED").length;

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>무료 이용권</h1>
          <p>쿠폰번호 대신 계정에 붙는 이용권을 발급합니다. 받는 분은 메일의 링크를 눌러 본인 계정에 등록합니다.</p>
        </div>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}><span>발급</span><strong>{credits.length}장</strong></div>
        <div className={styles.card}><span>미수령</span><strong>{unclaimed}장</strong><small>링크를 아직 안 누른 분</small></div>
        <div className={styles.card}><span>사용 완료</span><strong>{consumed}장</strong></div>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>새 이용권 발급</h2>
          <small>발급 후 링크를 메일로 보내세요</small>
        </div>
        <RewardIssuer siteUrl={siteUrl} />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>발급 내역</h2>
          <small>{credits.length}건</small>
        </div>
        {credits.length === 0 ? (
          <p className={styles.empty}>아직 발급한 이용권이 없습니다.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr><th>발급 시각</th><th>받는 사람</th><th>상품</th><th>사유</th><th>상태</th><th>수령 링크</th><th>수령</th><th>사용</th><th>메모</th></tr>
              </thead>
              <tbody>
                {credits.map((credit) => (
                  <tr key={credit.id}>
                    <td>{kst(credit.createdAt)}</td>
                    <td>{credit.recipientEmail}</td>
                    <td className={styles.mono}>{credit.product}</td>
                    <td>{REWARD_REASON_LABEL[credit.reason as RewardCreditReason] ?? credit.reason}</td>
                    <td><span className={`${styles.pill} ${STATUS_TONE[credit.status] ?? styles.pillMuted}`}>{REWARD_STATUS_LABEL[credit.status as RewardCreditStatus] ?? credit.status}</span></td>
                    {/* Kept visible after issuing: an operator who closes the
                        page loses the only copy of the link otherwise, and the
                        token cannot be regenerated for an existing credit. */}
                    <td>
                      {credit.status === "UNCLAIMED"
                        ? <ClaimLinkCell className={styles.linkCell} url={buildClaimUrl(siteUrl, credit.claimToken)} />
                        : <small className={styles.mono}>이미 수령됨</small>}
                    </td>
                    <td className={styles.mono}>{credit.claimedAt ? kst(credit.claimedAt) : ""}</td>
                    <td className={styles.mono}>{credit.consumedAt ? kst(credit.consumedAt) : ""}</td>
                    <td className={styles.wrap}>{credit.note ?? ""}</td>
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
