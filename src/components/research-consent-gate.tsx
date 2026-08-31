"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
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
 * 서버가 뭐라고 했는지를 지우지 않습니다.
 *
 * This briefly translated JWT errors into "sign out and back in", which turned
 * out to be advice that does not work: a freshly issued token, a token twenty
 * minutes old, and a re-login all fail the same way. Wording a guess as
 * instruction cost more time than the raw code ever did, and it hid the one
 * line that identifies the failure.
 *
 * So the note stays short and the server's own words stay attached.
 */
function describeFailure(code: string | undefined, message: string): string {
  const raw = [code, message].filter(Boolean).join(" · ") || "알 수 없는 오류";
  if (code === "401") return `로그인이 풀렸습니다. — ${raw}`;
  return raw;
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
        const response = await fetch("/api/research-consent");
        const body = await response.json() as { granted?: boolean | null };
        if (cancelled) return;
        if (typeof body.granted === "boolean") {
          setChoice(body.granted);
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
   */
  async function decide(granted: boolean) {
    setBusy(true);
    setFailed(null);
    try {
      const response = await fetch("/api/research-consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ granted }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        console.error("research-consent", response.status, body);
        setFailed(describeFailure(String(response.status), body.error ?? ""));
        onDecided(true);
        setBusy(false);
        return;
      }
      setChoice(granted);
      onDecided(true);
    } catch (error) {
      console.error("research-consent", error);
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
