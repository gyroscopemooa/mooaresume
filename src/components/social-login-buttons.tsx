"use client";

import { getSocialLoginProviders, type SocialLoginProvider } from "@/lib/auth/social-providers";
import styles from "./social-login-buttons.module.css";

export function SocialLoginButtons({ onSignIn, busy = false, className }: {
  onSignIn: (provider: SocialLoginProvider) => void;
  busy?: boolean;
  className?: string;
}) {
  const providers = getSocialLoginProviders();
  return <div className={styles.buttons} role="group" aria-label="로그인 방법" aria-busy={busy}>
    {providers.map(({ id, label }) => <button
      type="button"
      key={id}
      className={`${className ?? ""} ${styles.button}`}
      data-provider={id === "google" ? "google" : id === "kakao" ? "kakao" : "naver"}
      disabled={busy}
      onClick={() => onSignIn(id)}
    >{busy ? "이동 중..." : `${label}로 계속하기`}</button>)}
    {providers.length > 1 && <p className={styles.notice}>기존 이용 내역을 유지하려면 이전과 같은 방법으로 로그인해 주세요. {process.env.NEXT_PUBLIC_SOCIAL_ACCOUNT_LINKING_ENABLED === "true" ? "새 로그인 방법은 내 계정에서 연결할 수 있습니다." : "다른 방법으로 로그인하면 별도 계정이 만들어질 수 있습니다."}</p>}
  </div>;
}
