"use client";

import { useState } from "react";
import { CircleCheck, RefreshCw, TriangleAlert, Users } from "lucide-react";
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
  variant?: "gate" | "missing" | "stale";
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

  if (variant === "stale") {
    return <main className={styles.gate}>
      <div className={styles.card}>
        <div className={styles.mark} data-tone="warn"><TriangleAlert/></div>
        {/* Their account is right and the analysis finished; the stored document
            does not match the current result screen. Sending them to switch
            Google accounts would be sending them after something they cannot
            fix. */}
        <h1>결과는 저장돼 있는데<br/>화면이 열리지 않습니다.</h1>
        <p>계정을 바꾸거나 다시 결제하실 필요는 <b>없습니다.</b> 저희 쪽 화면 문제입니다.</p>
        <div className={styles.actions}>
          <a className={styles.primary} href={nextPath}><RefreshCw/> 다시 확인하기</a>
          <p className={styles.note}><b>{SUPPORT_EMAIL}</b>로 이 주소를 보내주시면 바로 열어 드립니다.</p>
        </div>
      </div>
    </main>;
  }

  if (variant === "missing") {
    return <main className={styles.gate}>
      <div className={styles.card}>
        <div className={styles.mark} data-tone="warn"><TriangleAlert/></div>
        <h1>이 계정에는<br/>결과가 없습니다.</h1>
        <p><b>결제하신 계정과 다른 계정</b>으로 로그인하셨을 수 있습니다. 분석이 아직 진행 중일 수도 있고요.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => signIn(true)} disabled={busy}>
            <Users/> {busy ? "이동 중" : "다른 계정으로 로그인"}
          </button>
          <a className={styles.secondary} href={nextPath}><RefreshCw/> 다시 확인하기</a>
          {failed && <p className={`${styles.note} ${styles.failed}`}>로그인 화면을 열지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
          {/* They paid. A dead end here is the worst screen on the site, so the
              last line is a person, not an apology. */}
          <p className={styles.note}>그래도 없으면 <b>{SUPPORT_EMAIL}</b>로 결제하신 메일 주소를 보내주세요.</p>
        </div>
      </div>
    </main>;
  }

  return <main className={styles.gate}>
    <div className={styles.card}>
      <div className={styles.mark}><CircleCheck/></div>
      <h1>첨삭이 끝났어요.</h1>
      {/* 왜 로그인이 필요한지 한 줄. 남의 자소서가 열리지 않는다는 말이기도
          해서, 이 문장은 안내이자 약속입니다. */}
      <p>결과는 본인 계정에서만 열립니다. 로그인하면 <b>바로 이 결과로</b> 돌아옵니다.</p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => signIn()} disabled={busy}>
          {busy ? "이동 중" : "Google로 계속하기"}
        </button>
        {failed && <p className={`${styles.note} ${styles.failed}`}>로그인 화면을 열지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
        <p className={styles.note}>결제하신 메일 주소와 같은 계정으로 로그인해 주세요.</p>
      </div>
    </div>
  </main>;
}
