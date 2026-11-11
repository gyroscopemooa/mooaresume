"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createAuthCallbackUrl } from "@/lib/app-context";
import { safeAuthNextPath } from "@/lib/auth/redirect";
import { getSocialLoginProviders, type SocialLoginProvider } from "@/lib/auth/social-providers";
import { SocialLoginButtons } from "./social-login-buttons";
import styles from "./complete-social-profile.module.css";

export function CompleteSocialProfile() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeAuthNextPath(params.get("next"));
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const initiatingUserId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await createClient().auth.getUser();
        if (cancelled) return;
        if (!error && data.user?.email && data.user.email_confirmed_at) {
          router.replace(next);
          return;
        }
        initiatingUserId.current = data.user?.id ?? null;
        setSignedIn(Boolean(data.user));
        if (data.user?.new_email) { setEmail(data.user.new_email); setSentEmail(data.user.new_email); }
      } catch { if (!cancelled) setMessage("로그인 정보를 확인하지 못했습니다. 다시 로그인해 주세요."); }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [next, router]);

  useEffect(() => {
    function restored(event: PageTransitionEvent) {
      if (!event.persisted) return;
      pending.current = false;
      setBusy(false);
    }
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  async function sendEmail() {
    if (pending.current) return;
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setMessage("확인 가능한 이메일 주소를 입력해 주세요."); return; }
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const client = createClient();
      const current = await client.auth.getUser();
      if (current.error || !initiatingUserId.current || current.data.user?.id !== initiatingUserId.current) {
        setMessage("로그인 계정이 바뀌었습니다. 화면을 새로고침한 뒤 다시 확인해 주세요.");
        return;
      }
      const { error } = await client.auth.updateUser({ email: value }, { emailRedirectTo: createAuthCallbackUrl(next) });
      if (error) { setMessage("확인 메일을 보내지 못했습니다. 기존 계정에서 사용하던 이메일이면 기존 로그인 방법을 이용해 주세요."); return; }
      const after = await client.auth.getUser();
      if (after.error || after.data.user?.id !== initiatingUserId.current) {
        setMessage("로그인 계정이 바뀌었거나 확인되지 않았습니다. 화면을 새로고침한 뒤 다시 확인해 주세요.");
        return;
      }
      setSentEmail(value);
      setToken("");
      setMessage("확인 메일을 보냈습니다. 같은 브라우저에서 링크를 열거나, 메일에 코드가 있으면 아래에 입력해 주세요.");
    } catch { setMessage("확인 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    finally { pending.current = false; setBusy(false); }
  }

  async function verifyEmail() {
    if (pending.current || !sentEmail) return;
    if (!/^\d{6,10}$/.test(token.trim())) { setMessage("메일에 받은 확인 코드를 입력해 주세요."); return; }
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const client = createClient();
      const current = await client.auth.getUser();
      if (current.error || !initiatingUserId.current || current.data.user?.id !== initiatingUserId.current) {
        setMessage("로그인 계정이 바뀌었거나 확인되지 않았습니다. 화면을 새로고침한 뒤 다시 확인해 주세요.");
        return;
      }
      const { error } = await client.auth.verifyOtp({ email: sentEmail, token: token.trim(), type: "email_change" });
      if (error) { setMessage("코드가 올바르지 않거나 만료됐습니다. 확인 메일을 다시 받아 주세요."); return; }
      const { data } = await client.auth.getUser();
      if (!data.user?.email || !data.user.email_confirmed_at || data.user.id !== initiatingUserId.current || data.user.email.toLowerCase() !== sentEmail.toLowerCase()) { setMessage("이메일 확인이 아직 완료되지 않았습니다. 받은 메일을 확인해 주세요."); return; }
      router.replace(next);
      router.refresh();
    } catch { setMessage("이메일을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    finally { pending.current = false; setBusy(false); }
  }

  async function continueWithExistingAccount(provider: SocialLoginProvider) {
    if (pending.current || !getSocialLoginProviders().some(({ id }) => id === provider)) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const client = createClient();
      const signedOut = await client.auth.signOut({ scope: "local" });
      // Local sign-out can clear this session even when server revocation fails.
      initiatingUserId.current = null;
      setSignedIn(false);
      setEmail("");
      setSentEmail("");
      setToken("");
      if (signedOut.error) throw signedOut.error;
      const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo: createAuthCallbackUrl(next), ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}) } });
      if (error) throw error;
    } catch {
      setMessage("로그인 화면을 열지 못했습니다. 다시 시도해 주세요.");
      pending.current = false;
      setBusy(false);
    }
  }

  return <main className={styles.page}><section className={styles.card} data-clarity-mask="True">
    <h1>이메일을 확인해 주세요</h1>
    <p>네이버 등 일부 로그인 방법은 이메일을 전달하지 않습니다. 현재 계정에서 분석 완료 알림을 받을 이메일을 한 번 확인합니다. 다음에 같은 소셜 계정으로 로그인하면 이 주소가 표시됩니다.</p>
    <p className={styles.notice}>기존 이용자라면 이전과 같은 방법으로 로그인해 주세요. 새 소셜 계정은 기존 구매 내역과 자동으로 합쳐지지 않습니다.</p>
    {!ready ? <p>로그인 정보를 확인하고 있어요.</p> : signedIn ? <>
      <form onSubmit={(event) => { event.preventDefault(); void sendEmail(); }}>
        <label htmlFor="social-email">이메일 주소</label>
        <input id="social-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} required />
        <button type="submit" disabled={busy}>{busy ? "처리 중..." : "확인 메일 받기"}</button>
      </form>
      {sentEmail && <form onSubmit={(event) => { event.preventDefault(); void verifyEmail(); }}>
        <label htmlFor="social-email-code">이메일 확인 코드</label>
        <input id="social-email-code" autoComplete="one-time-code" inputMode="numeric" value={token} onChange={(event) => setToken(event.target.value)} disabled={busy} maxLength={10} />
        <button type="submit" disabled={busy}>이메일 확인하고 계속하기</button>
      </form>}
    </> : <p>로그인이 만료됐습니다. 다시 로그인해 주세요.</p>}
    <section className={styles.existingAccount} aria-labelledby="existing-account-title">
      <h2 id="existing-account-title">기존 계정으로 로그인</h2>
      <p>전에 이용한 로그인 방법을 선택해 주세요. 선택하면 이 브라우저의 현재 로그인을 종료하고 다시 로그인합니다. 이메일을 등록하거나 바꿔도 다른 계정의 이용 내역은 합쳐지지 않습니다.</p>
      <SocialLoginButtons busy={busy || !ready} onSignIn={(provider) => void continueWithExistingAccount(provider)} />
    </section>
    <a href={next}>이전 화면으로 돌아가기</a>
    {message && <p role="status">{message}</p>}
  </section></main>;
}
