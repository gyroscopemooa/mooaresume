"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { REDACTION_LIMITS } from "@/domain/deidentify";
import styles from "./research-consent.module.css";

/**
 * 결제 전이 아니라 결과 화면에서 묻습니다.
 *
 * Before payment this is a checkbox in the way of something the applicant
 * wants, and a yes collected there is worth very little. Here they have the
 * result in hand and nothing is riding on the answer, which is the only
 * position from which "아니오" is genuinely free.
 *
 * 그리고 작게 둡니다. This is where the answer gets changed, not where it gets
 * explained — the explaining already happened before payment. A panel with a
 * heading, a lead paragraph, four bullets and a disclosure sat between the
 * finished 첨삭 and the referral block, taking a screen's worth of attention for
 * a decision most people had already made.
 */
export function ResearchConsent() {
  const [ready, setReady] = useState(false);
  const [known, setKnown] = useState(false);
  const [granted, setGranted] = useState(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // 브라우저에서 데이터베이스를 직접 부르지 않습니다 — 오늘 하루를 통째로
        // 먹은 경로가 정확히 이것이었고, 앱의 다른 저장은 전부 서버를 거칩니다.
        const response = await fetch("/api/research-consent");
        const body = await response.json() as { granted?: boolean | null };
        if (cancelled) return;
        // 로그인하지 않았거나, 지금 문구에 답한 적이 없으면 null 입니다. 예전
        // 문구에 한 동의는 이어받지 않습니다.
        setKnown(typeof body.granted === "boolean");
        setGranted(body.granted === true);
        setReady(true);
      } catch {
        // An offline browser or a blocked request is not the applicant's
        // problem, and the result they came for is already on screen. The ask
        // simply does not appear.
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function toggle(next: boolean) {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/research-consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ granted: next }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        console.error("research-consent", response.status, body);
        setStatus({ tone: "bad", text: `저장하지 못했습니다. (${response.status}${body.error ? ` · ${body.error}` : ""})` });
        setBusy(false);
        return;
      }
      setGranted(next);
      setStatus({
        tone: "ok",
        text: next ? "동의해 주셔서 고맙습니다." : "철회했습니다. 보관 중이던 사본도 삭제했습니다.",
      });
    } catch {
      setStatus({ tone: "bad", text: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." });
    }
    setBusy(false);
  }

  if (!ready || !known) return null;

  return (
    <section className={styles.box}>
      <div className={styles.row}>
        <label className={styles.toggle} data-on={granted}>
          <input type="checkbox" checked={granted} disabled={busy} onChange={(event) => void toggle(event.target.checked)}/>
          <span>이 지원서를 익명 사본으로 서비스 개선에 활용</span>
        </label>
        <button type="button" className={styles.more} aria-expanded={open} onClick={() => setOpen(!open)}>
          자세히 <ChevronDown className={open ? styles.up : ""}/>
        </button>
      </div>

      {open && <div className={styles.detail}>
        <p>보관 전에 <b>이름·연락처·이메일·주민번호·주소</b>를 지웁니다. 기간·회사명·직무·성과 수치는 남깁니다 — 이것까지 지우면 분석할 것이 없습니다.</p>
        <p><b>동의하지 않아도 결과와 기능은 완전히 같습니다.</b> 철회하시면 이미 보관 중인 사본도 그 자리에서 지우고, 이후 수집도 중단합니다.</p>
        {/* 지워지지 않는 것을 말하지 않으면 앞의 약속이 실제보다 강해집니다. */}
        <ul>
          {REDACTION_LIMITS.map((limit) => <li key={limit}>{limit}</li>)}
        </ul>
      </div>}

      {status && <p className={`${styles.status} ${status.tone === "ok" ? styles.ok : styles.bad}`}>{status.text}</p>}
    </section>
  );
}
