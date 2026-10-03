import { ArrowUpRight, Smartphone } from "lucide-react";
import styles from "./app-launch-banner.module.css";

export function AppLaunchBanner() {
  return (
    <a
      className={styles.banner}
      href="https://play.google.com/store/apps/details?id=com.mooaresume.twa"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="무아레쥬메 Android 앱 Google Play에서 설치하기 (새 탭)"
    >
      <span className={styles.icon} aria-hidden="true"><Smartphone size={27} /></span>
      <span className={styles.copy}>
        <span className={styles.eyebrow}>ANDROID APP · 출시</span>
        <strong>무아레쥬메, 이제 앱으로 만나세요</strong>
        <span className={styles.description}>내 손안에서 이어가는 자소서 첨삭과 취업 준비</span>
      </span>
      <span className={styles.action}>Google Play에서 설치 <ArrowUpRight size={17} aria-hidden="true" /></span>
    </a>
  );
}
