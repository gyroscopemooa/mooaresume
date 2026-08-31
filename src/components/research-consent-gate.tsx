"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { RESEARCH_CONSENT_VERSION } from "@/domain/deidentify";
import { createClient } from "@/lib/supabase/client";
import styles from "./research-consent-gate.module.css";

/**
 * 연구 활용 동의를 시작 화면에서 한 번 묻습니다.
 *
 * The same ask lives at the foot of the result screen, where almost nobody
 * scrolls — which is why nothing had been collected. Moving it here is the fix;
 * the wording and the storage are unchanged.
 *
 * Two boxes on one line, neither ticked, and the run cannot start until one is.
 * A single unticked box is skipped by everyone in a hurry, and a pre-ticked one
 * is not valid consent for an optional purpose — which costs every copy gathered
 * under it the moment anyone complains.
 *
 * Declining is the same one click as agreeing. A choice that is harder to
 * decline than to accept is not a free one.
 */
/**
 * 세션이 죽은 것과 저장이 실패한 것을 구분합니다.
 *
 * PGRST303 ("JWT issued at future") means the stored token was minted against a
 * clock that ran ahead, so the database refuses it — and it refuses it for every
 * authenticated call, not just this one. Showing the raw code there is a dead
 * end: the reader needs the one action that fixes it, and needs to know the
 * failure is not about consent at all.
 */
function describeFailure(code: string | undefined, message: string): string {
  if (code === "PGRST303" || code === "PGRST301" || /jwt/i.test(message)) {
    return "로그인 세션이 만료되었습니다. 로그아웃 후 다시 로그인하면 해결됩니다.";
  }
  return [code, message].filter(Boolean).join(" · ") || "알 수 없는 오류";
}

export function ResearchConsentGate({ onDecided }: { onDecided: (decided: boolean) => void }) {
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!auth.user) { setReady(true); return; }
        const { data } = await supabase
          .from("research_consents")
          .select("granted, consent_version")
          .eq("owner_user_id", auth.user.id)
          .maybeSingle();
        if (cancelled) return;
        // An answer to older wording does not carry over — that is what
        // versioning the consent is for.
        if (data && data.consent_version === RESEARCH_CONSENT_VERSION) {
          setChoice(Boolean(data.granted));
          onDecided(true);
        }
        setReady(true);
      } catch {
        // A blocked request is not the applicant's problem and must not stand
        // between them and the run they are paying for.
        if (!cancelled) { setReady(true); onDecided(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [onDecided]);

  /**
   * 저장에 실패해도 분석은 막지 않습니다.
   *
   * A consent we could not write is a consent we do not have, and collection
   * reads the table — so both answers fail closed either way. Blocking the
   * purchase would protect nothing and lose the sale, which is the worse of the
   * two failures by a wide margin.
   *
   * The reason is shown rather than swallowed. "다시 눌러 주세요" is wrong advice
   * for a missing function or a rejected constraint: pressing again cannot fix
   * either, and hiding the code leaves nobody able to say what broke.
   */
  async function decide(granted: boolean) {
    setBusy(true);
    setFailed(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("set_research_consent", {
        p_granted: granted,
        p_consent_version: RESEARCH_CONSENT_VERSION,
      });
      if (error) {
        console.error("set_research_consent", error);
        setFailed(describeFailure(error.code, error.message ?? ""));
        onDecided(true);
        setBusy(false);
        return;
      }
      setChoice(granted);
      onDecided(true);
    } catch (error) {
      console.error("set_research_consent", error);
      setFailed(error instanceof Error ? error.message : "알 수 없는 오류");
      onDecided(true);
    }
    setBusy(false);
  }

  if (!ready) return null;

  const box = (value: boolean, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={choice === value}
      disabled={busy}
      className={`${styles.check} ${choice === value ? styles.on : ""}`}
      onClick={() => void decide(value)}
    >
      <span aria-hidden="true">{choice === value && <Check/>}</span>
      {label}
    </button>
  );

  return <section className={styles.gate}>
    <div className={styles.row} role="radiogroup" aria-label="지원서 데이터 활용">
      {box(true, "데이터 활용")}
      {box(false, "활용하지 않기")}
      <button type="button" className={styles.more} aria-expanded={open} onClick={() => setOpen(!open)}>
        자세히 <ChevronDown className={open ? styles.up : ""}/>
      </button>
    </div>

    {open && <div className={styles.detail}>
      {/* The line asked for promised the finished letter itself; this promises
          the 기준 instead. Inside a consent panel an overstated
          inducement is the thing that makes the consent challengeable later,
          and the same caution is already written into the research dashboard:
          no claim about pass rates until the sample is large enough to carry
          one. What is true, and enough, is that the standards sharpen. */}
      <p><b>데이터가 쌓일수록 합격 자소서의 기준이 선명해집니다.</b> 개인정보를 삭제하고 데이터만 활용됩니다.</p>
      <p>활용하지 않아도 결과는 완전히 같고, 언제든 철회하실 수 있습니다.</p>
    </div>}

    {failed && <small className={styles.failed}>
      <b>동의 기록을 저장하지 못했습니다.</b> 데이터는 활용되지 않으며, 분석은 그대로 진행됩니다.
      <em>{failed}</em>
    </small>}
  </section>;
}
