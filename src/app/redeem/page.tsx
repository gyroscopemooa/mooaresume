import type { Metadata } from "next";
import Link from "next/link";
import { Gift } from "lucide-react";
import styles from "./[token]/redeem.module.css";

/**
 * What someone sees at /redeem with nothing after it.
 *
 * The route is /redeem/{token}, so a bare /redeem used to 404 — which is what
 * anyone gets who types the address from memory, or whose mail client trimmed
 * the link. A 404 tells them their ticket is gone; it is not.
 */
export const metadata: Metadata = {
  title: "무료 이용권 받기",
  robots: { index: false, follow: false },
};

export default function RedeemIndexPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.gift}><Gift/></div>
        <span className={styles.eyebrow}>MOOA RESUME</span>
        <h1>받으신 메일의 링크로<br/>들어와 주세요.</h1>
        <p>
          이용권은 <b>메일에 담긴 링크 전체</b>로만 받으실 수 있습니다. 주소 뒤에 붙은 긴 문자열까지 포함해야 해요.
        </p>
        <p className={styles.note}>
          링크를 잃어버리셨다면 문의해 주세요. 이미 계정에 등록하신 이용권은 <b>결제 화면에서 자동으로 적용</b>되니 이 페이지에 다시 오실 필요가 없습니다.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.secondary} style={{ display: "block", textAlign: "center" }}>홈으로 가기</Link>
        </div>
      </section>
    </main>
  );
}
