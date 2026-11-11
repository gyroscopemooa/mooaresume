"use client";

import { useEffect, useRef, useState } from "react";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleUser } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isDashboardOnly } from "@/lib/auth/delivery-preference";
import { emailCompletionPath } from "@/lib/auth/redirect";
import { createAuthCallbackUrl } from "@/lib/app-context";
import { getSocialLoginOptions, getSocialLoginProviders, getSocialLoginLabel, getLinkedSocialLoginLabels, type SocialLoginProvider } from "@/lib/auth/social-providers";
import { SocialLoginButtons } from "./social-login-buttons";
import { getAuthCallbackMessage, isIdentityConflict } from "@/lib/auth/callback-message";
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
  const [dashboardOnly, setDashboardOnly] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(false);
  const [accountReadFailed, setAccountReadFailed] = useState(false);
  const accountRead = useRef(0);
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
        setDashboardOnly(isDashboardOnly(data.user));
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
        setDashboardOnly(isDashboardOnly(data.user));
        setSignedIn(Boolean(data.user));
        setLinkedProviders(data.user?.identities?.map((identity) => identity.provider) ?? []);
      }).catch(() => {});
      router.refresh();
    }
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, [router]);

  async function toggleAccountMenu() {
    if (open) { setOpen(false); return; }
    if (busy) return;
    const read = ++accountRead.current;
    setOpen(true);
    setCheckingAccount(true);
    setMessage("");
    try {
      const { data, error } = await createClient().auth.getUser();
      if (read !== accountRead.current) return;
      if (error && !isAuthSessionMissingError(error) && error.code !== "session_not_found") throw error;
      setEmail(data.user?.email ?? null);
      setEmailConfirmed(Boolean(data.user?.email && data.user.email_confirmed_at));
        setDashboardOnly(isDashboardOnly(data.user));
      setSignedIn(Boolean(data.user));
      setLinkedProviders(data.user?.identities?.map((identity) => identity.provider) ?? []);
      setAccountReadFailed(false);
    } catch {
      if (read === accountRead.current) {
        setAccountReadFailed(true);
        setMessage("현재 계정 정보를 확인하지 못했습니다. 메뉴를 닫았다가 다시 열어 주세요.");
      }
    } finally {
      if (read === accountRead.current) setCheckingAccount(false);
    }
  }

  async function signIn(provider: SocialLoginProvider = "google", link = false) {
    if (inFlight.current || checkingAccount || (link && accountReadFailed)) return;
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
    } catch (error) {
      setMessage(link && isIdentityConflict(error)
        ? getAuthCallbackMessage("identity_already_exists")!
        : `${getSocialLoginLabel(provider)} ${link ? "계정 연결" : "로그인"}을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.`);
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function signOut() {
    if (busy || checkingAccount || accountReadFailed) return;
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

  const socialLabels = getLinkedSocialLoginLabels(linkedProviders);
  const linkableProviders = process.env.NEXT_PUBLIC_SOCIAL_ACCOUNT_LINKING_ENABLED === "true"
    ? getSocialLoginProviders().filter(({ id }) => !linkedProviders.includes(id)) : [];

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
      <button type="button" className={styles.trigger} aria-label="내 계정" aria-expanded={open} aria-haspopup="true" onClick={() => void toggleAccountMenu()}><CircleUser/> <span>내 계정</span></button>
      {open && <div className={styles.drop}>
        <div className={styles.accountSummary} data-clarity-mask="True" aria-busy={checkingAccount}>
          <span className={styles.accountLabel}>계정·알림 이메일</span>
          <div className={styles.email}>{email ?? (dashboardOnly ? "대시보드 전용 계정" : "이메일 확인 필요")}</div>
          {socialLabels.length > 0 && <p className={styles.identity}>연결된 소셜 로그인: {socialLabels.join(" · ")}</p>}
          <p className={styles.accountHelp}>이메일 주소와 소셜 로그인은 별개입니다.</p>
        </div>
        {dashboardOnly && <p className={styles.accountHelp}>서비스 알림 메일 없이 대시보드에서 확인합니다.</p>}
        {dashboardOnly && <Link href="/app/my#account-delivery" onClick={() => setOpen(false)}>이메일·이용 방식 변경</Link>}
        {!dashboardOnly && !emailConfirmed && <Link href={emailCompletionPath(typeof window === "undefined" ? "/app/my" : `${window.location.pathname}${window.location.search}`)} onClick={() => setOpen(false)}>이메일 확인하기</Link>}
        {linkableProviders.length > 0 && <p className={styles.accountHelp}>다른 계정에 연결되지 않은 소셜 계정만 추가할 수 있습니다. 이용 내역은 합쳐지지 않습니다.</p>}
        {linkableProviders.map(({ id, label }) => <button key={id} type="button" disabled={busy || checkingAccount || accountReadFailed} onClick={() => void signIn(id, true)}>{label} 계정 연결</button>)}
        {message && <p role="alert">{message}</p>}
        <Link href="/app/my" onClick={() => setOpen(false)}>대시보드 · 내 분석</Link>
        <Link href="/refer" onClick={() => setOpen(false)}>추천코드 · 무료 이용권</Link>
        <Link href="/analyze" onClick={() => setOpen(false)}>새 지원서 분석하기</Link>
        <button type="button" className={styles.signOut} onClick={() => void signOut()} disabled={busy || checkingAccount || accountReadFailed}>
          {busy ? "로그아웃 중..." : "로그아웃"}
        </button>
      </div>}
    </div>
  );
}
