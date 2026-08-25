"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { REDACTION_LIMITS, RESEARCH_CONSENT_VERSION } from "@/domain/deidentify";
import styles from "./research-consent.module.css";



/**
 * Asked on the result screen, not before payment.
 *
 * Before payment this is a checkbox in the way of something the applicant
 * wants, and a yes collected there is worth very little. Here they have the
 * result in hand and nothing is riding on the answer, which is the only
 * position from which "아니오" is genuinely free.
 */
export function ResearchConsent() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [granted, setGranted] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!auth.user) {
        setSignedIn(false);
        setReady(true);
        return;
      }
      const { data } = await supabase
        .from("research_consents")
        .select("granted, consent_version")
        .eq("owner_user_id", auth.user.id)
        .maybeSingle();
      if (cancelled) return;
      setSignedIn(true);
      // Consent to an older wording does not carry over, so the box comes back
      // unchecked and they get to decide again on the current sentences.
      setGranted(Boolean(data?.granted) && data?.consent_version === RESEARCH_CONSENT_VERSION);
      setReady(true);
      } catch {
        // A missing client, an offline browser, a blocked request — none of
        // those are the applicant's problem, and the result they came for is
        // already on screen. The ask simply does not appear.
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function toggle(next: boolean) {
    setBusy(true);
    setStatus(null);
    const error = await (async () => {
      try {
        const supabase = createClient();
        return (await supabase.rpc("set_research_consent", {
          p_granted: next,
          p_consent_version: RESEARCH_CONSENT_VERSION,
        })).error;
      } catch {
        return new Error("CLIENT_UNAVAILABLE");
      }
    })();
    setBusy(false);
    if (error) {
      setStatus({ tone: "bad", text: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." });
      return;
    }
    setGranted(next);
    setStatus({
      tone: "ok",
      text: next ? "동의해 주셔서 고맙습니다. 언제든 이 자리에서 철회하실 수 있습니다." : "철회했습니다. 보관 중이던 사본도 삭제했습니다.",
    });
  }

  if (!ready || !signedIn) return null;

  return (
    <section className={styles.box}>
      <div className={styles.head}>
        <ShieldCheck/>
        <div>
          <h3>이 지원서를 서비스 개선에 써도 될까요?</h3>
          <p>
            무아레쥬메는 실제 지원 결과에서 배웁니다. 동의해 주시면 이 지원서와 첨삭 전후의 변화를 <b>개인정보를 지운 사본</b>으로 보관하고, 어떤 표현이 강점이 되고 어떤 요소가 감점 위험이 되는지 판단 기준을 다듬는 데 씁니다.
          </p>
        </div>
      </div>

      <label className={styles.toggle} data-on={granted}>
        <input
          type="checkbox"
          checked={granted}
          disabled={busy}
          onChange={(event) => void toggle(event.target.checked)}
        />
        <span>{granted ? "활용에 동의했습니다" : "익명 사본 활용에 동의합니다"}</span>
      </label>

      <ul className={styles.detail}>
        <li>보관 전에 <b>이름·연락처·이메일·주민번호·주소</b>를 지웁니다.</li>
        <li>기간·회사명·직무·성과 수치는 남깁니다. 이것까지 지우면 분석할 것이 없습니다.</li>
        <li><b>동의하지 않아도 결과와 기능은 완전히 같습니다.</b> 지금 받으신 첨삭에는 아무 영향이 없습니다.</li>
        <li>철회하시면 <b>이미 보관 중인 사본도 그 자리에서 지웁니다.</b> 이후 수집도 중단됩니다.</li>
      </ul>

      <details className={styles.limits}>
        <summary>지워지지 않는 것도 있습니다</summary>
        <ul>
          {REDACTION_LIMITS.map((limit) => <li key={limit}>{limit}</li>)}
        </ul>
      </details>

      {status && <p className={`${styles.status} ${status.tone === "ok" ? styles.ok : styles.bad}`}>{status.text}</p>}
    </section>
  );
}
