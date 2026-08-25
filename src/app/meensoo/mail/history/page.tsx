import Link from "next/link";
import { listMailLog } from "@/server/admin/admin-repository";
import styles from "../../admin.module.css";
import { kst } from "../../format";
import { Pill } from "../../pill";

export const dynamic = "force-dynamic";

export default async function MailHistoryPage() {
  const entries = await listMailLog(300);
  const failed = entries.filter((entry) => entry.status === "FAILED");
  // Grouped only for the count: each row stays visible on its own, because
  // "who exactly got it" is the question this page answers.
  const batches = new Set(entries.map((entry) => entry.batchId)).size;

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>메일 발송 기록</h1>
          <p>어느 주소로 보냈고 어디서 실패했는지 한 줄씩 남습니다. 본문과 첨부 파일 이름도 함께 남습니다. 최근 300건.</p>
        </div>
        <Link href="/meensoo/mail" className={styles.mono}>← 메일 보내기</Link>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}><span>보낸 통수</span><strong>{entries.length}통</strong><small>발송 {batches}회</small></div>
        <div className={styles.card}><span>실패</span><strong>{failed.length}통</strong></div>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>발송 내역</h2>
          <small>{entries.length}건</small>
        </div>
        {entries.length === 0 ? (
          <p className={styles.empty}>아직 발송 기록이 없습니다. 이 화면은 기록 기능을 넣은 뒤 보낸 메일부터 표시합니다.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr><th>보낸 시각</th><th>받는 사람</th><th>제목</th><th>보낸 내용</th><th>회신 주소</th><th>상태</th><th>실패 이유</th></tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{kst(entry.sentAt)}</td>
                    <td>{entry.recipient}</td>
                    <td className={styles.wrap}>{entry.subject}</td>
                    {/* Folded rather than shown: the log is scanned for "who
                        got it", and a full body in every row buries that. */}
                    <td className={styles.wrap}>
                      {entry.body ? (
                        <details className={styles.bodyPeek}>
                          <summary>본문 보기</summary>
                          <pre>{entry.body}</pre>
                          {entry.attachmentNames.length > 0 && (
                            <small>첨부 {entry.attachmentNames.length}개 · {entry.attachmentNames.join(", ")}</small>
                          )}
                        </details>
                      ) : (
                        <small className={styles.mono}>기록 없음</small>
                      )}
                    </td>
                    <td className={styles.mono}>{entry.replyTo ?? "기본"}</td>
                    <td><Pill status={entry.status} /></td>
                    <td className={`${styles.mono} ${styles.wrap}`}>{entry.errorMessage ?? ""}</td>
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
