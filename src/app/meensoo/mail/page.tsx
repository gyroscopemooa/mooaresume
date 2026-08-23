import Link from "next/link";
import styles from "../admin.module.css";
import { MailComposer } from "./mail-composer";

export const dynamic = "force-dynamic";

export default function AdminMailPage() {
  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>메일 보내기</h1>
          <p>Resend에 등록한 발신 주소로 보냅니다. 받는 사람에게는 서로의 주소가 보이지 않습니다.</p>
        </div>
        <Link href="/meensoo/mail/history" className={styles.mono}>발송 기록 →</Link>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>새 메일</h2>
          <small>한 명씩 따로 발송됩니다</small>
        </div>
        <MailComposer />
      </section>
    </>
  );
}
