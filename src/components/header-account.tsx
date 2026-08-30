"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleUser } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await createClient().auth.getUser();
        if (cancelled) return;
        setEmail(data.user?.email ?? null);
        setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function signIn() {
    setBusy(true);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        // Back to the page they were on, not to a dashboard they did not ask
        // for.
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${window.location.pathname}` },
      });
      if (error) setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await createClient().auth.signOut();
      setEmail(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (!email) {
    return (
      <button type="button" className={styles.link} onClick={() => void signIn()} disabled={busy}>
        {busy ? "이동 중..." : "로그인"}
      </button>
    );
  }

  return (
    <div className={styles.menu}>
      <button type="button" className={styles.trigger} aria-label="내 계정"><CircleUser/> <span>내 계정</span></button>
      <div className={styles.drop}>
        <div className={styles.email}>{email}</div>
        <Link href="/refer">추천코드 · 무료 이용권</Link>
        <Link href="/analyze">새 지원서 분석하기</Link>
        <button type="button" className={styles.signOut} onClick={() => void signOut()} disabled={busy}>
          {busy ? "로그아웃 중..." : "로그아웃"}
        </button>
      </div>
    </div>
  );
}
