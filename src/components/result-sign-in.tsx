"use client";

import { useState } from "react";
import { LogIn, RefreshCw, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./result-sign-in.module.css";

const SUPPORT_EMAIL = "support@mooaresume.com";

/**
 * The sign-in door for a result link that arrived by email.
 *
 * The completion email points at /result?analysisRunId=…, which is opened in
 * whatever browser the mail app hands it to — usually one with no session. The
 * page used to answer with a link to /analysis/prepare: not a login screen at
 * all, but the pre-payment screen, which after signing in shows a 결제 button
 * greyed out because that tab never held the draft. The analysisRunId was
 * dropped on the way, so there was no route back to the result either.
 *
 * Signing in here returns to this exact URL, run id and all.
 */
type Props = {
  nextPath: string;
  /**
   * "missing" is the harder case: signed in, but this account has no result for
   * that run. They paid, so the screen has to offer a way out rather than a
   * description of the problem — most often they signed in with a different
   * Google account than they bought with.
   */
  variant?: "gate" | "missing";
};

export function ResultSignIn({ nextPath, variant = "gate" }: Props) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn(switchAccount = false) {
    setBusy(true);
    setFailed(false);
    try {
      const client = createClient();
      // Signed out first, otherwise Google hands the same session straight back
      // and the "다른 계정" button appears to do nothing.
      if (switchAccount) await client.auth.signOut();
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          // Forces the account chooser. Without it Google silently reuses the
          // account that is already signed in — the very one that cannot see
          // this result.
          queryParams: switchAccount ? { prompt: "select_account" } : {},
        },
      });
      if (error) { setFailed(true); setBusy(false); }
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  if (variant === "missing") {
    return <main className={styles.gate}>
      <div className={styles.card}>
        <span className={styles.warn}>확인 필요</span>
        <h1>이 계정에서는 결과가 보이지 않습니다.</h1>
        <p>분석이 아직 진행 중이거나, <b>결제하신 계정과 다른 계정</b>으로 로그인하셨을 수 있습니다.</p>
        <button type="button" onClick={() => signIn(true)} disabled={busy}>
          <Users/> {busy ? "이동 중" : "다른 계정으로 로그인하기"}
        </button>
        <a className={styles.secondary} href={nextPath}><RefreshCw/> 다시 확인하기</a>
        {failed && <small className={styles.failed}>로그인 화면을 열지 못했습니다. 잠시 후 다시 시도해 주세요.</small>}
        {/* They paid. A dead end here is the worst screen on the site, so the
            last line is a person, not an apology. */}
        <small>그래도 보이지 않으면 <b>{SUPPORT_EMAIL}</b>로 결제하신 메일 주소를 알려주세요. 확인해서 바로 열어 드립니다.</small>
      </div>
    </main>;
  }

  return <main className={styles.gate}>
    <div className={styles.card}>
      <span>분석 완료</span>
      <h1>결과가 준비되어 있습니다.</h1>
      <p>결과는 분석을 요청한 계정에서만 열립니다. 로그인하시면 <b>이 결과 화면으로 바로</b> 돌아옵니다.</p>
      <button type="button" onClick={() => signIn()} disabled={busy}>
        <LogIn/> {busy ? "이동 중" : "Google로 로그인하고 결과 보기"}
      </button>
      {failed && <small className={styles.failed}>로그인 화면을 열지 못했습니다. 잠시 후 다시 시도해 주세요.</small>}
      <small>결제하신 메일 주소와 같은 계정으로 로그인해 주세요.</small>
    </div>
  </main>;
}
