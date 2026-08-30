"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { RESEARCH_CONSENT_VERSION } from "@/domain/deidentify";
import { createClient } from "@/lib/supabase/client";
import styles from "./research-consent-gate.module.css";

/**
 * 연구 활용 동의를 시작 화면에 한 줄로.
 *
 * The same ask already lives at the foot of the result screen, where almost
 * nobody scrolls — which is why nothing had been collected. Moving it here is
 * the whole fix; the wording and the storage are unchanged.
 *
 * One unticked line, not a pre-ticked one. A pre-ticked box is not valid
 * consent for an optional purpose, and consent that would not survive a
 * complaint is worse than none: every copy gathered under it has to be deleted.
 *
 * The detail is folded away rather than printed. Four lines of policy above a
 * pay button is read by nobody and makes the screen feel heavier than the
 * decision is.
 */
export function ResearchConsentGate() {
  const [ready, setReady] = useState(false);
  const [granted, setGranted] = useState(false);
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
        setGranted(Boolean(data?.granted) && data?.consent_version === RESEARCH_CONSENT_VERSION);
        setReady(true);
      } catch {
        // A blocked request is not the applicant's problem and must not stand
        // between them and the run they are paying for.
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function toggle() {
    const next = !granted;
    setBusy(true);
    setFailed(false);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("set_research_consent", {
        p_granted: next,
        p_consent_version: RESEARCH_CONSENT_VERSION,
      });
      if (error) { setFailed(true); setBusy(false); return; }
      setGranted(next);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  if (!ready) return null;

  return <section className={styles.gate}>
    <div className={styles.row}>
      <button
        type="button"
        role="checkbox"
        aria-checked={granted}
        disabled={busy}
        className={`${styles.check} ${granted ? styles.on : ""}`}
        onClick={() => void toggle()}
      >
        <span aria-hidden="true">{granted && <Check/>}</span>
        익명 사본을 서비스 개선에 써도 좋습니다
      </button>
      <button type="button" className={styles.more} aria-expanded={open} onClick={() => setOpen(!open)}>
        자세히 <ChevronDown className={open ? styles.up : ""}/>
      </button>
    </div>

    {open && <div className={styles.detail}>
      <p>개인정보를 삭제하고 데이터만 활용됩니다. 이름·연락처·주소는 지우고, 회사명·직무·기간·성과 수치만 남깁니다.</p>
      <p><b>동의하지 않아도 결과와 기능은 완전히 같습니다.</b> 언제든 결과 화면 아래에서 철회하실 수 있고, 철회하시면 보관 중이던 사본도 함께 지웁니다.</p>
    </div>}

    {failed && <small className={styles.failed}>저장하지 못했습니다. 다시 눌러 주세요.</small>}
  </section>;
}
