import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Scale } from "lucide-react";
import styles from "./legal-service-chrome.module.css";

/** Legal-only navigation; the employment tools keep their existing header. */
export function LegalServiceHeader() {
  return <header className={styles.header}>
    <Link href="/legal" className={styles.brand} aria-label="나홀로소송 내 사건 홈">
      <span className={styles.mark}><Scale aria-hidden="true" /></span>
      <span><small>MOOA</small><b>나홀로소송</b></span>
    </Link>
    <nav className={styles.nav} aria-label="나홀로소송 메뉴">
      <Link href="/legal#legal-guide" className={styles.guide}>이용 안내</Link>
      <Link href="/legal" className={styles.cases}>내 사건 <ArrowUpRight aria-hidden="true" /></Link>
    </nav>
  </header>;
}

export function LegalServiceFooter() {
  return <footer className={styles.footer}>
    <p>AI가 정리한 초안입니다. 제출 전 사실과 기한을 직접 확인해 주세요.</p>
    <nav aria-label="서비스 정보">
      <Link href="/privacy">개인정보 처리방침</Link>
      <Link href="/"><ArrowLeft aria-hidden="true" /> MOOA Resume</Link>
    </nav>
  </footer>;
}
