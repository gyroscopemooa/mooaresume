import Link from "next/link";
import styles from "./home-header-wordmark.module.css";

export function HomeHeaderWordmark() {
  return (
    <Link
      href="/"
      className={`brand ${styles.wordmark}`}
      aria-label="무아레쥬메 (MOOA Resume) 홈"
    >
      <span className={`brand-mark ${styles.emblem}`} aria-hidden="true">
        <span className={`${styles.glyph} ${styles.glyphKorean}`}>무</span>
        <span className={`${styles.glyph} ${styles.glyphEnglish}`}>M</span>
      </span>
      <div className={styles.names} aria-hidden="true">
        <span className={`${styles.name} ${styles.nameKorean}`}>무아레쥬메</span>
        <span className={`${styles.name} ${styles.nameEnglish}`}>MOOA RESUME</span>
      </div>
    </Link>
  );
}
