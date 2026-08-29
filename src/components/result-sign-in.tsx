"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./result-sign-in.module.css";

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
export function ResultSignIn({ nextPath }: { nextPath: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setBusy(true);
    setFailed(false);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
      });
      if (error) { setFailed(true); setBusy(false); }
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return <main className={styles.gate}>
    <div className={styles.card}>
      <span>분석 완료</span>
      <h1>결과가 준비되어 있습니다.</h1>
      <p>결과는 분석을 요청한 계정에서만 열립니다. 로그인하시면 <b>이 결과 화면으로 바로</b> 돌아옵니다.</p>
      <button type="button" onClick={signIn} disabled={busy}>
        <LogIn/> {busy ? "이동 중" : "Google로 로그인하고 결과 보기"}
      </button>
      {failed && <small className={styles.failed}>로그인 화면을 열지 못했습니다. 잠시 후 다시 시도해 주세요.</small>}
      <small>결제하신 메일 주소와 같은 계정으로 로그인해 주세요.</small>
    </div>
  </main>;
}
