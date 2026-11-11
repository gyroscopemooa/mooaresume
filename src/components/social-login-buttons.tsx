"use client";

import Image from "next/image";
import { useState } from "react";
import { getSocialLoginOptions, type SocialLoginProvider } from "@/lib/auth/social-providers";
import styles from "./social-login-buttons.module.css";

export function SocialLoginButtons({ onSignIn, busy = false, className }: {
  onSignIn: (provider: SocialLoginProvider) => void;
  busy?: boolean;
  className?: string;
}) {
  const providers = getSocialLoginOptions();
  const [showComingSoon, setShowComingSoon] = useState(false);
  return <div className={styles.buttons} role="group" aria-label="로그인 방법" aria-busy={busy}>
    {providers.map(({ id, label, status }) => <button
      type="button"
      key={id}
      className={`${id === "google" ? className ?? "" : ""} ${styles.button}`}
      data-provider={id === "google" ? "google" : id === "kakao" ? "kakao" : "naver"}
      data-readiness={status}
      disabled={busy}
      onClick={() => {
        if (status === "coming-soon") { setShowComingSoon(true); return; }
        setShowComingSoon(false);
        onSignIn(id);
      }}
    >{busy ? "이동 중..." : id === "google" ? <><Image src="/auth/google-g.png" alt="" aria-hidden="true" width={18} height={18} unoptimized className={styles.googleIcon} /><span>{label}로 계속하기</span></> : <><Image src={id === "kakao" ? "/auth/kakao-login.svg" : "/auth/naver-login.png"} alt="" aria-hidden="true" width={id === "kakao" ? 224 : 210} height={id === "kakao" ? 46 : 48} unoptimized className={styles.brandImage} /><span className={styles.srOnly}>{status === "coming-soon" ? "네이버 로그인 준비 중" : `${label}로 계속하기`}</span>{status === "coming-soon" && <span className={styles.comingSoonBadge} aria-hidden="true">준비 중</span>}</>}</button>)}
    {showComingSoon && <p className={styles.comingSoonMessage} role="status">네이버 로그인은 준비 중입니다.</p>}
    {providers.filter(({ status }) => status === "available").length > 1 && <p className={styles.notice}>기존 이용 내역을 유지하려면 이전과 같은 방법으로 로그인해 주세요. {process.env.NEXT_PUBLIC_SOCIAL_ACCOUNT_LINKING_ENABLED === "true" ? "새 로그인 방법은 내 계정에서 연결할 수 있습니다." : "다른 방법으로 로그인하면 별도 계정이 만들어질 수 있습니다."}</p>}
  </div>;
}
