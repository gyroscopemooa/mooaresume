import { listInquiries } from "@/server/admin/admin-repository";
import styles from "../admin.module.css";
import { kst } from "../format";
import { Pill } from "../pill";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const inquiries = await listInquiries(200);
  const unanswered = inquiries.filter((inquiry) => inquiry.status === "NEW").length;

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>문의</h1>
          <p>사이트 문의 폼으로 들어온 내용입니다. 최근 200건.</p>
        </div>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}><span>새 문의</span><strong>{unanswered}건</strong></div>
        <div className={styles.card}><span>전체</span><strong>{inquiries.length}건</strong></div>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>문의 목록</h2>
          <small>{inquiries.length}건</small>
        </div>
        {inquiries.length === 0 ? (
          // The table is ready before the form exists, so the empty state has
          // to say that rather than read as a bug.
          <p className={styles.empty}>
            아직 문의가 없습니다.<br />
            저장할 곳은 준비돼 있으니, 사이트에 문의 폼을 만들면 여기에 바로 쌓입니다.
          </p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr><th>받은 시각</th><th>보낸 사람</th><th>분류</th><th>내용</th><th>상태</th><th>메모</th></tr>
              </thead>
              <tbody>
                {inquiries.map((inquiry) => (
                  <tr key={inquiry.id}>
                    <td>{kst(inquiry.createdAt)}</td>
                    <td>{inquiry.name ? `${inquiry.name} · ` : ""}{inquiry.email}</td>
                    <td>{inquiry.category ?? "—"}</td>
                    <td className={styles.wrap}>{inquiry.message}</td>
                    <td>
                      <Pill status={inquiry.status} />
                      {inquiry.answeredAt && <div className={styles.mono}>{kst(inquiry.answeredAt)}</div>}
                    </td>
                    <td className={styles.wrap}>{inquiry.adminNote ?? ""}</td>
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
