import styles from "./app-launch-banner.module.css";

/** Google Play 로고(삼각형 4색). 공식 배지 느낌을 내는 단순화한 벡터입니다. */
function PlayMark() {
  return (
    <svg viewBox="0 0 512 512" width="30" height="30" aria-hidden="true">
      <path fill="#00d2ff" d="M48 28c-6 6-10 15-10 27v402c0 12 4 21 10 27l222-228z" />
      <path fill="#00f076" d="M345 177 270 256l75 79 107-62c19-11 19-29 0-40z" />
      <path fill="#ff3a44" d="M270 256 48 484c8 8 21 9 36 1l261-150z" />
      <path fill="#ffd500" d="M345 177 84 27c-15-8-28-7-36 1l222 228z" />
    </svg>
  );
}

export function AppLaunchBanner() {
  return (
    <a
      className={styles.banner}
      href="https://play.google.com/store/apps/details?id=com.mooaresume.twa"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="무아레쥬메 Android 앱 Google Play에서 설치하기 (새 탭)"
    >
      <span className={styles.icon} aria-hidden="true">M</span>
      <span className={styles.copy}>
        <strong>MOOA Resume</strong>
        <span className={styles.meta}>자소서 첨삭 · 취업 준비 · MOOA</span>
        <span className={styles.description}>무아레쥬메, 이제 앱으로 만나세요</span>
      </span>
      <span className={styles.action}>
        <PlayMark />
        <span><small>GET IT ON</small><b>Google Play</b></span>
      </span>
    </a>
  );
}
