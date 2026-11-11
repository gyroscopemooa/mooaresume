"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleUser } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { emailCompletionPath } from "@/lib/auth/redirect";
import { createAuthCallbackUrl } from "@/lib/app-context";
import { getSocialLoginOptions, getSocialLoginProviders, getSocialLoginLabel, type SocialLoginProvider } from "@/lib/auth/social-providers";
import { SocialLoginButtons } from "./social-login-buttons";
import styles from "./header-account.module.css";

/**
 * The way back in.
 *
 * Until now there was no sign-in anywhere in the site chrome: an account could
 * only be reached by starting an analysis, opening a reward link, or landing on
 * /refer. Someone who paid last week and came back to see their credits had
 * nowhere to go, and someone handed a referral code had to write a cover letter
 * before they could enter it.
 *
 * Renders nothing until the session is known. A header that shows 로그인 for a
 * moment and then swaps to the account menu tells every returning visitor they
 * were logged out, every time.
 */
export function HeaderAccount() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  // Click, not hover.
  //
  // The dropdown opened on :hover and :focus-within only, so on a phone there
  // was no way in: the account icon sat there and tapping it did nothing, which
  // meant a signed-in visitor could not sign out at all.
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await createClient().auth.getUser();
        if (cancelled) return;
        setEmail(data.user?.email ?? null);
        setEmailConfirmed(Boolean(data.user?.email && data.user.email_confirmed_at));
        setSignedIn(Boolean(data.user));
        setLinkedProviders(data.user?.identities?.map((identity) => identity.provider) ?? []);
        setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    function restored(event: PageTransitionEvent) {
      if (!event.persisted) return;
      inFlight.current = false;
      setBusy(false);
      void createClient().auth.getUser().then(({ data }) => {
        setEmail(data.user?.email ?? null);
        setEmailConfirmed(Boolean(data.user?.email && data.user.email_confirmed_at));
        setSignedIn(Boolean(data.user));
        setLinkedProviders(data.user?.identities?.map((identity) => identity.provider) ?? []);
      }).catch(() => {});
      router.refresh();
    }
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, [router]);

  async function signIn(provider: SocialLoginProvider = "google", link = false) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage("");
    try {
      const client = createClient();
      const credentials = {
        provider,
        options: { redirectTo: createAuthCallbackUrl(`${window.location.pathname}${window.location.search}`) },
      };
      const { error } = link
        ? await client.auth.linkIdentity(credentials)
        : await client.auth.signInWithOAuth(credentials);
      if (error) throw error;
    } catch {
      setMessage(`${getSocialLoginLabel(provider)} ${link ? "계정 연결" : "로그인"}을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.`);
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await createClient().auth.signOut();
      setEmail(null);
      setSignedIn(false);
      setLinkedProviders([]);
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (!signedIn) {
    // Preserve the one-click Google entrypoint until extra providers are ready.
    if (getSocialLoginOptions().length === 1) return <button type="button" className={styles.link} onClick={() => void signIn()} disabled={busy}>{busy ? "이동 중..." : "로그인"}</button>;
    return <div className={styles.menu} ref={wrapRef}>
      <button type="button" className={styles.link} onClick={() => setOpen((current) => !current)} aria-expanded={open}>로그인</button>
      {open && <div className={styles.drop}>
        <SocialLoginButtons busy={busy} onSignIn={(provider) => void signIn(provider)} />
        {message && <p role="alert">{message}</p>}
      </div>}
    </div>;
  }

  return (
    <div className={styles.menu} ref={wrapRef}>
      <button type="button" className={styles.trigger} aria-label="내 계정" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((current) => !current)}><CircleUser/> <span>내 계정</span></button>
      {open && <div className={styles.drop}>
        <div className={styles.email}>{email ?? "이메일 확인 필요"}</div>
        {!emailConfirmed && <Link href={emailCompletionPath(typeof window === "undefined" ? "/app/my" : `${window.location.pathname}${window.location.search}`)} onClick={() => setOpen(false)}>이메일 확인하기</Link>}
        {process.env.NEXT_PUBLIC_SOCIAL_ACCOUNT_LINKING_ENABLED === "true" && getSocialLoginProviders().filter(({ id }) => !linkedProviders.includes(id)).map(({ id, label }) => <button key={id} type="button" disabled={busy} onClick={() => void signIn(id, true)}>{label} 계정 연결</button>)}
        {message && <p role="alert">{message}</p>}
        <Link href="/refer" onClick={() => setOpen(false)}>추천코드 · 무료 이용권</Link>
        <Link href="/analyze" onClick={() => setOpen(false)}>새 지원서 분석하기</Link>
        <button type="button" className={styles.signOut} onClick={() => void signOut()} disabled={busy}>
          {busy ? "로그아웃 중..." : "로그아웃"}
        </button>
      </div>}
    </div>
  );
}
