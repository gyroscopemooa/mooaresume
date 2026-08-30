"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { RESEARCH_CONSENT_VERSION } from "@/domain/deidentify";
import { createClient } from "@/lib/supabase/client";
import styles from "./research-consent-gate.module.css";

/**
 * 연구 활용 동의를 시작 직전에 한 번 묻습니다.
 *
 * The ask already exists at the foot of the result screen, and almost nobody
 * scrolls that far — the collected count sat at zero. The instinct is to
 * pre-tick the box, but a pre-ticked box is not valid consent for an optional
 * purpose under Korean law, and consent that would not survive a complaint is
 * worse than no consent: every copy collected under it has to be deleted.
 *
 * So the box is not pre-ticked. It is simply unavoidable — one of two answers
 * must be chosen before the run starts, with no default. That is a real
 * decision, it is recorded as one, and it reaches everyone rather than the few
 * who reach the bottom of a finished result.
 *
 * Declining costs the applicant nothing and the screen says so, because a
 * question that implies a penalty is not a free choice either.
 */
export function ResearchConsentGate({ onDecided }: { onDecided: (decided: boolean) => void }) {
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

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
        // Answered already, on this wording — do not ask a second time. Changing
        // the wording resets it, which is the point of versioning the consent.
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

  async function decide(granted: boolean) {
    setBusy(true);
    setFailed(false);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("set_research_consent", {
        p_granted: granted,
        p_consent_version: RESEARCH_CONSENT_VERSION,
      });
      if (error) { setFailed(true); setBusy(false); return; }
      setChoice(granted);
      onDecided(true);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  if (!ready) return null;

  return <section className={styles.gate}>
    <b>시작 전에 하나만 골라 주세요</b>
    <p>무아레쥬메는 실제 지원 결과에서 배웁니다. 개인정보를 지운 사본을 보관해도 될지 정해 주세요.</p>
    <div className={styles.options}>
      <button type="button" disabled={busy} aria-pressed={choice === true} className={choice === true ? styles.picked : ""} onClick={() => void decide(true)}>
        {choice === true && <Check/>}
        <b>익명 사본을 서비스 개선에 써도 좋습니다</b>
        <span>이름·연락처·주소를 지운 사본만 보관합니다. 어떤 표현이 강점이 되고 무엇이 감점 위험인지, 판단 기준이 실제 결과로 다듬어집니다.</span>
      </button>
      <button type="button" disabled={busy} aria-pressed={choice === false} className={choice === false ? styles.picked : ""} onClick={() => void decide(false)}>
        {choice === false && <Check/>}
        <b>사용하지 않겠습니다</b>
        <span>결과와 기능은 완전히 같습니다. 지금 받으실 첨삭에는 아무 영향이 없습니다.</span>
      </button>
    </div>
    {failed && <small className={styles.failed}>저장하지 못했습니다. 다시 눌러 주세요.</small>}
    {choice !== null && <small>언제든 결과 화면 아래에서 바꾸실 수 있습니다. 철회하시면 보관 중이던 사본도 함께 지웁니다.</small>}
  </section>;
}
