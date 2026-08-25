"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeReferralError, parseReferralCode } from "@/domain/referral";
import styles from "./referral-code-entry.module.css";

/**
 * Entering a code someone gave you.
 *
 * Signing in is not a formality here — it is the answer to "whose account does
 * this apply to". A code identifies the person who gets rewarded; the account
 * entering it is the person who was referred. Without a session there is no
 * second half, so a signed-out visitor is asked to sign in rather than shown a
 * field that could not do anything.
 *
 * Used in two places with the same rules: the checkout screen, where it belongs
 * in the flow, and /refer, where someone who was handed a code will look for it.
 */
export function ReferralCodeEntry({
  requireSignIn = false,
  returnTo = "/refer",
  compact = false,
}: {
  /** Offer a sign-in when signed out, rather than rendering nothing. */
  requireSignIn?: boolean;
  returnTo?: string;
  /**
   * Sized to sit among the other notes on the checkout screen. There it is an
   * optional aside beside "분석에는 5~10분", not the thing being decided, and a
   * full-size card claimed more attention than it earns.
   */
  compact?: boolean;
}) {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!requireSignIn) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await createClient().auth.getUser();
        if (!cancelled) setSignedIn(Boolean(data.user));
      } catch {
        if (!cancelled) setSignedIn(false);
      }
    })();
    return () => { cancelled = true; };
  }, [requireSignIn]);

  async function signIn() {
    setBusy(true);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${returnTo}` },
      });
      if (error) setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  /**
   * Records that this account arrived through someone's code.
   *
   * Pays nobody. The referrer is credited from the paid-order path, because a
   * reward on entry is a reward for typing — and the first person to notice
   * writes a loop that types their own code on a hundred throwaway accounts.
   */
  async function apply() {
    const parsed = parseReferralCode(code);
    if (!parsed.ok) {
      setMessage(parsed.reason === "empty" ? "코드를 입력해 주세요." : "코드 형식을 확인해 주세요. 예: MOOA7KQ2XZ");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await createClient().rpc("apply_referral_code", { p_code: parsed.code });
      if (error) {
        setMessage(describeReferralError(error.message));
        return;
      }
      setApplied(true);
      setMessage("추천코드가 적용되었습니다. 회원님이 첫 결제를 마치면 추천해 주신 분께 이용권이 지급됩니다.");
    } catch {
      setMessage("추천코드를 적용하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const needsSignIn = requireSignIn && signedIn === false;

  // Compact is one line: a label, the field, the button. On the checkout screen
  // this is a footnote beside "분석에는 5~10분", and a two-line card with its own
  // heading read as a step in the flow.
  if (compact) {
    return (
      <div className={styles.compact} data-applied={applied}>
        <div className={styles.compactRow}>
          <span className={styles.compactLabel}><Users/> 추천코드<em>선택</em></span>
          {needsSignIn ? (
            // A sign-in button already sits a few lines below. Two is two
            // decisions about the same thing.
            <small className={styles.compactHint}>로그인하시면 입력칸이 열립니다</small>
          ) : (
            <>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="MOOA7KQ2XZ"
                disabled={busy || applied}
                maxLength={20}
                aria-label="추천코드"
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void apply(); } }}
              />
              <button type="button" onClick={() => void apply()} disabled={busy || applied}>
                {applied ? "완료" : busy ? "확인 중" : "적용"}
              </button>
            </>
          )}
        </div>
        {message && <p className={styles.compactMessage} data-ok={applied}>{message}</p>}
      </div>
    );
  }

  return (
    <div className={styles.card} data-applied={applied}>
      <div className={styles.head}>
        <Users/>
        <span>
          받은 추천코드가 있으신가요?
          <small>
            {needsSignIn
              ? "코드는 로그인한 계정에 적용됩니다. 먼저 로그인해 주세요."
              : "선택 · 친구가 코드를 주셨다면 넣어 주세요"}
          </small>
        </span>
      </div>
      {needsSignIn ? (
        <button type="button" className={styles.signIn} onClick={() => void signIn()} disabled={busy}>
          {busy ? "이동 중..." : "Google로 계속하기"} <ArrowRight size={15}/>
        </button>
      ) : (
        <div className={styles.row}>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="MOOA7KQ2XZ"
            disabled={busy || applied}
            maxLength={20}
            aria-label="추천코드"
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void apply(); } }}
          />
          <button type="button" onClick={() => void apply()} disabled={busy || applied}>
            {applied ? "적용 완료" : busy ? "확인 중..." : "적용하기"}
          </button>
        </div>
      )}
      {message && <p className={styles.message} data-ok={applied}>{message}</p>}
    </div>
  );
}
