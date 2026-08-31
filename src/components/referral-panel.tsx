"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { REFERRAL_TERMS } from "@/domain/referral";
import styles from "./referral-panel.module.css";

/**
 * The applicant's own referral code, and what it has earned.
 *
 * Shown on the result screen for the same reason the research consent is: they
 * have just been handed something that worked, which is the only moment anyone
 * is inclined to tell a friend. A referral panel on the landing page is asking
 * a stranger to vouch for a product they have not used.
 */
export function ReferralPanel({ standalone = false }: { standalone?: boolean } = {}) {
  const [code, setCode] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(0);
  const [converted, setConverted] = useState(0);
  const [status, setStatus] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (cancelled) return;
        setSignedIn(Boolean(auth.user));
        if (!auth.user) return;
        // Created on first view rather than at sign-up: an account that never
        // reaches a result never needs one.
        const { data: issued, error: issueError } = await supabase.rpc("get_or_create_referral_code");
        if (cancelled) return;
        // 코드를 못 받은 것과 코드가 없는 것은 다릅니다.
        //
        // Failing quietly hid the panel entirely, which reads as "this account
        // has no referral code" — indistinguishable from a call that never got
        // an answer.
        if (issueError) { console.error("get_or_create_referral_code", issueError); setFailed([issueError.code, issueError.message].filter(Boolean).join(" · ")); return; }
        setCode(typeof issued === "string" ? issued : null);
        const { data: rows, error: rowsError } = await supabase.from("referral_attributions").select("status");
        if (cancelled) return;
        if (rowsError) { console.error("referral_attributions", rowsError); setFailed([rowsError.code, rowsError.message].filter(Boolean).join(" · ")); return; }
        if (!rows) return;
        setPending(rows.filter((row) => row.status === "PENDING").length);
        setConverted(rows.filter((row) => row.status === "CONVERTED").length);
      } catch (error) {
        console.error("referral-panel", error);
        if (!cancelled) setFailed(error instanceof Error ? error.message : "알 수 없는 오류");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setStatus({ tone: "ok", text: "코드를 복사했습니다." });
    } catch {
      setStatus({ tone: "bad", text: "복사하지 못했습니다. 코드를 직접 선택해 복사해 주세요." });
    }
  }

  async function signIn() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/refer` },
      });
      if (error) setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  // On the result screen the panel simply does not appear for a signed-out
  // visitor — there is nothing to show and they did not come for this. On its
  // own page that would be a blank screen, so it offers the sign-in instead.
  if (failed) {
    if (!standalone) return null;
    return <section className={styles.panel}>
      <p className={styles.failed}><b>추천 코드를 불러오지 못했습니다.</b> 코드가 없는 것이 아니라 조회에 실패한 것입니다. 새로고침해 보시고, 계속 안 되면 알려 주세요. <em>{failed}</em></p>
    </section>;
  }

  if (!code) {
    if (!standalone) return null;
    if (signedIn === null) return null;
    if (signedIn) {
      // Signed in and the code did not come back. Saying so beats a blank
      // space, which reads as "this account has no referral code".
      return (
        <section className={styles.panel}>
          <div className={styles.head}>
            <Users/>
            <div>
              <h3>추천코드를 불러오지 못했어요</h3>
              <p>잠시 후 새로고침해 주세요. 계속 안 되면 문의해 주시면 확인해 드리겠습니다.</p>
            </div>
          </div>
        </section>
      );
    }
    return (
      <section className={styles.panel}>
        <div className={styles.head}>
          <Users/>
          <div>
            <h3>추천코드를 보려면 로그인해 주세요</h3>
            <p>코드는 계정마다 하나씩 발급됩니다. 로그인하시면 바로 확인하실 수 있어요.</p>
          </div>
        </div>
        <div className={styles.codeRow}>
          <button type="button" className={styles.copy} onClick={() => void signIn()} disabled={busy}>
            {busy ? "이동 중..." : "Google로 계속하기"} <ArrowRight size={15}/>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <Users/>
        <div>
          <h3>친구에게 추천하고, 무료 이용권을 받아보세요</h3>
          <p>친구가 이 코드를 넣고 결제를 마치면, <b>친구가 결제한 것과 같은 상품의 무료 이용권 1장</b>이 회원님 계정에 바로 들어옵니다.</p>
        </div>
      </div>

      <div className={styles.codeRow}>
        <span className={styles.code}>{code}</span>
        <button type="button" className={styles.copy} onClick={() => void copy()}>코드 복사</button>
      </div>

      <ul className={styles.terms}>
        {REFERRAL_TERMS.map((term) => <li key={term}><span>{term}</span></li>)}
      </ul>

      {/* Two bare zeros say nothing and look like a rendering fault. Until
          something has happened, say what will appear here instead. */}
      {pending + converted === 0
        ? <p className={styles.tallyEmpty}>아직 추천 기록이 없습니다. 친구가 코드를 넣고 결제하면 여기에 표시됩니다.</p>
        : <div className={styles.tally}>
            <div><span>결제 대기</span><strong>{pending}명</strong></div>
            <div><span>지급 완료</span><strong>{converted}장</strong></div>
          </div>}

      {status && <p className={`${styles.status} ${status.tone === "ok" ? styles.ok : styles.bad}`}>{status.text}</p>}
    </section>
  );
}
