"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Gift, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  describeClaimFailure,
  isClaimToken,
  readClaimError,
  type ClaimOutcome,
  type RewardCreditProduct,
} from "@/domain/reward-credit";
import styles from "./redeem.module.css";

const PRODUCT_LABEL: Record<RewardCreditProduct, string> = {
  QUICK: "QUICK 무료 이용권",
  PRO: "PRO 무료 이용권",
  FINAL: "FINAL 무료 이용권",
};

type Phase = "checking" | "needs_login" | "claiming" | "done" | "failed";

/**
 * The page a reward mail links to.
 *
 * The whole reason this screen exists rather than the mail carrying a code: the
 * person decides here which account the credit lands on. Event signups arrive
 * from work or naver addresses while the same person signs in with Google, and
 * a system that matched on the address would hand them nothing.
 *
 * Claiming is attempted automatically for anyone already signed in, because
 * for them the button would be a step with no decision in it.
 */
export function RedeemClient({ token }: { token: string }) {
  const router = useRouter();
  // A malformed token is decided from the token itself, so it is the initial
  // state rather than something an effect discovers a render later.
  const validToken = isClaimToken(token);
  const [phase, setPhase] = useState<Phase>(validToken ? "checking" : "failed");
  const [outcome, setOutcome] = useState<ClaimOutcome | null>(validToken ? null : { ok: false, reason: "not_found" });
  const [busy, setBusy] = useState(false);

  const claim = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("claim_reward_credit", { p_claim_token: token });
    if (error) {
      setOutcome({ ok: false, reason: readClaimError(error.message) });
      setPhase("failed");
      return;
    }
    const result = data as { product: RewardCreditProduct; alreadyClaimed: boolean; consumed: boolean };
    setOutcome({ ok: true, product: result.product, alreadyClaimed: result.alreadyClaimed, consumed: result.consumed });
    setPhase("done");
  }, [token]);

  useEffect(() => {
    if (!validToken) return;
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        setPhase("needs_login");
        return;
      }
      setPhase("claiming");
      await claim();
    })();
    return () => { cancelled = true; };
  }, [validToken, claim]);

  async function signInWithGoogle() {
    setBusy(true);
    const supabase = createClient();
    // Comes back to this same page, so the credit is claimed the moment the
    // account exists rather than leaving them on a screen with no credit.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/redeem/${token}` },
    });
    if (error) setBusy(false);
  }

  if (phase === "checking" || phase === "claiming") {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <div className={styles.gift}><Gift/></div>
          <span className={styles.eyebrow}>MOOA RESUME</span>
          <h1>이용권을 확인하고 있어요.</h1>
          <p>잠시만 기다려 주세요.</p>
        </section>
      </main>
    );
  }

  if (phase === "needs_login") {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <div className={styles.gift}><Gift/></div>
          <span className={styles.eyebrow}>무료 이용권이 도착했습니다</span>
          <h1>이용권을 받을 계정을<br/>연결해 주세요.</h1>
          <p>로그인하시면 그 계정에 이용권이 등록됩니다. <b>메일을 받으신 주소와 로그인 주소가 달라도 괜찮습니다.</b></p>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={signInWithGoogle} disabled={busy}>
              {busy ? "이동 중..." : "Google로 계속하기"} <ArrowRight size={17}/>
            </button>
          </div>
          <p className={styles.note}>
            이 링크는 <b>한 번만</b> 사용할 수 있습니다. 먼저 연결한 계정에 이용권이 등록되니, <b>평소 쓰시는 계정</b>으로 로그인해 주세요.
          </p>
        </section>
      </main>
    );
  }

  if (phase === "done" && outcome?.ok) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <div className={styles.gift}><Gift/></div>
          <span className={styles.eyebrow}>{outcome.alreadyClaimed ? "이미 등록된 이용권" : "이용권이 등록되었습니다"}</span>
          <h1>{outcome.consumed ? "이미 사용한 이용권이에요." : "이 계정에서 바로 쓰실 수 있어요."}</h1>
          <div className={styles.product}><b>{PRODUCT_LABEL[outcome.product]}</b><span>× 1</span></div>
          <p>
            {outcome.consumed
              ? "이 이용권은 이미 분석에 사용되었습니다. 결과는 지원서 화면에서 확인하실 수 있어요."
              : "지원서를 넣고 결제 화면까지 가시면 이용권을 사용하는 버튼이 보입니다. 별도의 쿠폰번호를 입력하실 필요는 없습니다."}
          </p>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => router.push("/analyze")}>
              지원서 넣으러 가기 <ArrowRight size={17}/>
            </button>
          </div>
          <p className={styles.note}>이용권은 <b>이 계정에 귀속</b>됩니다. 다른 기기에서도 같은 계정으로 로그인하시면 그대로 남아 있습니다.</p>
        </section>
      </main>
    );
  }

  const failure = describeClaimFailure(outcome?.ok === false ? outcome.reason : "unknown");
  return (
    <main className={styles.page}>
      <section className={`${styles.card} ${styles.bad}`}>
        <div className={styles.gift}><TriangleAlert/></div>
        <span className={styles.eyebrow}>MOOA RESUME</span>
        <h1>{failure.title}</h1>
        <p>{failure.detail}</p>
        <div className={styles.actions}>
          <button className={styles.secondary} onClick={() => router.push("/")}>홈으로 가기</button>
        </div>
      </section>
    </main>
  );
}
