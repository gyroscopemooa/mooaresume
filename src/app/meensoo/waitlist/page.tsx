import { listWaitlist } from "@/server/admin/admin-repository";
import styles from "../admin.module.css";
import { kst } from "../format";

export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  const entries = await listWaitlist(500);
  const bySource = entries.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.source] = (counts[entry.source] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>사전 신청</h1>
          <p>랜딩에서 소식 받기를 신청한 주소입니다. 최근 500건.</p>
        </div>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}><span>전체</span><strong>{entries.length}명</strong></div>
        {Object.entries(bySource).map(([source, count]) => (
          <div key={source} className={styles.card}><span>{source}</span><strong>{count}명</strong></div>
        ))}
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>신청 목록</h2>
          {/* Pasted straight into the composer's recipient box, which accepts
              a comma list. */}
          <small>메일 보내기 화면에 쉼표로 붙여넣을 수 있습니다</small>
        </div>
        {entries.length === 0 ? (
          <p className={styles.empty}>아직 신청이 없습니다.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr><th>신청 시각</th><th>이메일</th><th>경로</th></tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{kst(entry.createdAt)}</td>
                    <td>{entry.email}</td>
                    <td className={styles.mono}>{entry.source}</td>
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
