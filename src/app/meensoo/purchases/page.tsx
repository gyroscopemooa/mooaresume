import { listPurchases } from "@/server/admin/admin-repository";
import styles from "../admin.module.css";
import { krw, kst } from "../format";
import { Pill } from "../pill";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const purchases = await listPurchases(200);
  const paid = purchases.filter((purchase) => purchase.status === "PAID");
  const total = paid.reduce((sum, purchase) => sum + purchase.amount, 0);
  const free = paid.filter((purchase) => purchase.amount === 0).length;

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>구매 내역</h1>
          <p>누가 무엇을 결제했는지 봅니다. 최근 200건.</p>
        </div>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}><span>결제 완료</span><strong>{paid.length}건</strong></div>
        <div className={styles.card}><span>매출</span><strong>{krw(total)}</strong></div>
        <div className={styles.card}><span>무료(100% 할인)</span><strong>{free}건</strong><small>금액 0원으로 기록됩니다</small></div>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>전체 결제</h2>
          <small>{purchases.length}건</small>
        </div>
        {purchases.length === 0 ? (
          <p className={styles.empty}>아직 구매 기록이 없습니다.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>결제 시각</th><th>구매자</th><th>상품</th><th>금액</th>
                  <th>상태</th><th>회사 · 직무</th><th>Polar 주문</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td>{kst(purchase.paidAt)}</td>
                    <td>{purchase.email}</td>
                    <td>{purchase.product}</td>
                    <td>{krw(purchase.amount)}</td>
                    <td>
                      <Pill status={purchase.status} />
                      {purchase.refundedAt && <div className={styles.mono}>{kst(purchase.refundedAt)}</div>}
                    </td>
                    <td>{[purchase.companyName, purchase.roleName].filter(Boolean).join(" · ") || purchase.caseTitle || "—"}</td>
                    {/* The full id, not a prefix: this is the value pasted into
                        Polar search when a payment has to be traced. */}
                    <td className={styles.mono}>{purchase.orderId}</td>
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
