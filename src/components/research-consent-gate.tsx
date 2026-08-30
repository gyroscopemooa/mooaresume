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
 * Two boxes rather than one, and one has to be ticked before the run starts. A
 * single unticked box is skipped by everyone in a hurry, and a pre-ticked one is
 * not valid consent for an optional purpose — consent that would not survive a
 * complaint costs every copy gathered under it. Two boxes with no default is a
 * real decision, and it reaches everyone who pays.
 *
 * Declining is the same one click as agreeing. A choice that is harder to
 * decline than to accept is not a free one.
 */
export function ResearchConsentGate({ onDecided }: { onDecided: (decided: boolean) => void }) {
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
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
      {box(true, "데이터베이스 활용")}
      {box(false, "없이 진행하기")}
      <button type="button" className={styles.more} aria-expanded={open} onClick={() => setOpen(!open)}>
        자세히 <ChevronDown className={open ? styles.up : ""}/>
      </button>
    </div>

    {open && <div className={styles.detail}>
      <p>개인정보를 삭제하고 데이터만 활용됩니다. 이름·연락처·주소는 지우고, 회사명·직무·기간·성과 수치만 남깁니다.</p>
      <p><b>활용하지 않아도 결과와 기능은 완전히 같습니다.</b> 언제든 결과 화면 아래에서 철회하실 수 있고, 철회하시면 보관 중이던 사본도 함께 지웁니다.</p>
    </div>}

    {failed && <small className={styles.failed}>저장하지 못했습니다. 다시 눌러 주세요.</small>}
  </section>;
}
