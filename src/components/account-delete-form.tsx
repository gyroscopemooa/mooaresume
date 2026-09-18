"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ACCOUNT_DELETION_CONFIRMATION, isAccountDeletionEnabled } from "@/lib/account-deletion";
import styles from "./account-delete-form.module.css";

type Props = { showSignInHint?: boolean };

export function AccountDeleteForm({ showSignInHint = false }: Props) {
  const router = useRouter();
  const enabled = isAccountDeletionEnabled();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void createClient().auth.getUser().then(({ data }) => { if (!cancelled) setSignedIn(Boolean(data.user)); }).catch(() => { if (!cancelled) setSignedIn(false); });
    return () => { cancelled = true; };
  }, [enabled]);

  if (!enabled || signedIn === null) return null;
  if (!signedIn) {
    return showSignInHint
      ? <p className={styles.hint}>로그인한 상태에서 이 화면의 삭제 버튼으로 바로 삭제할 수 있습니다. <Link href="/app/my">로그인하러 가기</Link></p>
      : null;
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: typed }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        setError(body?.error ?? "계정을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setBusy(false);
        return;
      }
      await createClient().auth.signOut().catch(() => undefined);
      router.replace("/");
      router.refresh();
    } catch {
      setError("네트워크 오류로 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  return <section className={styles.box}>
    <h2>계정 바로 삭제</h2>
    {!open
      ? <button type="button" className={styles.danger} onClick={() => setOpen(true)}>계정과 데이터 삭제</button>
      : <div className={styles.panel}>
        <ul>
          <li>계정과 올려 둔 자료, 분석 결과, 커뮤니티 글·댓글·첨부가 <b>바로 삭제되고 되돌릴 수 없습니다.</b></li>
          <li>아직 쓰지 않은 이용권과 무료 이용권도 함께 사라집니다.</li>
          <li>결제·환불 기록은 법령에 따라 <b>5년</b> 동안 이름 없이 보관됩니다. Google Play 결제 내역은 Google이 보관합니다.</li>
        </ul>
        <label>
          계속하려면 <b>{ACCOUNT_DELETION_CONFIRMATION}</b>을 입력하세요
          <input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" disabled={busy} />
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} disabled={busy} onClick={() => { setOpen(false); setTyped(""); setError(""); }}>취소</button>
          <button type="button" className={styles.danger} disabled={busy || typed !== ACCOUNT_DELETION_CONFIRMATION} onClick={() => void submit()}>{busy ? "삭제 중..." : "영구 삭제"}</button>
        </div>
      </div>}
  </section>;
}
