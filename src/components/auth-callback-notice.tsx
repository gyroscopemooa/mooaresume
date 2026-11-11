"use client";

import { useEffect, useState } from "react";
import { getAuthCallbackMessage } from "@/lib/auth/callback-message";
import styles from "./auth-callback-notice.module.css";

export function AuthCallbackNotice() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    function readStatus() { setMessage(getAuthCallbackMessage(new URLSearchParams(window.location.search).get("auth_reason"))); }
    readStatus();
    window.addEventListener("pageshow", readStatus);
    window.addEventListener("popstate", readStatus);
    return () => { window.removeEventListener("pageshow", readStatus); window.removeEventListener("popstate", readStatus); };
  }, []);
  if (!message) return null;
  return <aside className={styles.notice} role="status"><span>{message}</span><button type="button" aria-label="로그인 알림 닫기" onClick={() => {
    setMessage(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("auth_reason");
    url.searchParams.delete("auth_error");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }}>닫기</button></aside>;
}
