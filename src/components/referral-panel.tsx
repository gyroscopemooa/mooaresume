"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
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
export function ReferralPanel() {
  const [code, setCode] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [converted, setConverted] = useState(0);
  const [status, setStatus] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (cancelled || !auth.user) return;
        // Created on first view rather than at sign-up: an account that never
        // reaches a result never needs one.
        const { data: issued } = await supabase.rpc("get_or_create_referral_code");
        if (cancelled) return;
        setCode(typeof issued === "string" ? issued : null);
        const { data: rows } = await supabase.from("referral_attributions").select("status");
        if (cancelled || !rows) return;
        setPending(rows.filter((row) => row.status === "PENDING").length);
        setConverted(rows.filter((row) => row.status === "CONVERTED").length);
      } catch {
        // No panel rather than an error. Nothing here is what they came for.
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

  if (!code) return null;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <Users/>
        <div>
          <h3>친구에게 추천하고 무료 이용권 받기</h3>
          <p>친구가 이 코드를 넣고 첫 결제를 마치면, <b>QUICK 무료 이용권 1장</b>이 회원님 계정에 바로 들어옵니다.</p>
        </div>
      </div>

      <div className={styles.codeRow}>
        <span className={styles.code}>{code}</span>
        <button type="button" className={styles.copy} onClick={() => void copy()}>코드 복사</button>
      </div>

      <ul className={styles.terms}>
        {REFERRAL_TERMS.map((term) => <li key={term}><span>{term}</span></li>)}
      </ul>

      <div className={styles.tally}>
        <div><span>결제 대기</span><strong>{pending}명</strong></div>
        <div><span>지급 완료</span><strong>{converted}장</strong></div>
      </div>

      {status && <p className={`${styles.status} ${status.tone === "ok" ? styles.ok : styles.bad}`}>{status.text}</p>}
    </section>
  );
}
