"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

function safeNext(value: string | null) {
  return value?.startsWith("/career") && !value.startsWith("//") ? value : "/career/profile";
}

export default function CareerLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(searchParams.get("auth_error") ?? "");

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await createClient().auth.getUser();
        if (data.user) router.replace(next);
      } catch { /* The form remains available if auth is temporarily unavailable. */ }
    })();
  }, [next, router]);

  const callbackUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function continueWithGoogle() {
    setBusy(true); setMessage("");
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl() } });
    if (error) { setMessage("Google 로그인을 시작하지 못했습니다."); setBusy(false); }
  }

  async function sendMagicLink() {
    if (!email.trim()) { setMessage("로그인 링크를 받을 이메일을 입력해 주세요."); return; }
    setBusy(true); setMessage("");
    const { error } = await createClient().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: callbackUrl() } });
    setBusy(false);
    setMessage(error ? "로그인 링크를 보내지 못했습니다. 잠시 후 다시 시도해 주세요." : "로그인 링크를 이메일로 보냈습니다. 같은 브라우저에서 열어 주세요.");
  }

  return <main className={styles.page}>
    <Link href="/career" className={styles.back}><ArrowLeft />커리어 검사 홈</Link>
    <section className={styles.card}>
      <span>CAREER PROFILE</span><h1>내 결과를<br />계속 보관하기</h1>
      <p>로그인하면 이 기기에서 완료한 검사 결과를 프로필에 모아 보고, 나중에 AI 해설에 사용할 자료를 직접 선택할 수 있어요.</p>
      <button type="button" className={styles.google} disabled={busy} onClick={() => void continueWithGoogle()}>Google로 계속하기 <ArrowRight /></button>
      <div className={styles.divider}><span>또는 이메일로 로그인</span></div>
      <label><Mail /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일 주소" /></label>
      <button type="button" className={styles.email} disabled={busy} onClick={() => void sendMagicLink()}>{busy ? "처리 중" : "로그인 링크 받기"}<ArrowRight /></button>
      {message && <p className={styles.message} aria-live="polite">{message}</p>}
      <small><ShieldCheck />검사 결과와 자료는 내 계정에서만 확인합니다.</small>
    </section>
  </main>;
}
