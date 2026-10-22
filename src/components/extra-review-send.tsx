"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin-extra-review.module.css";

const PREVIEW_EMAIL_KEY = "mooa:extra-review-preview-email";
const LINK_DAYS = 7;

/**
 * 추가 첨삭 발송 버튼. "나에게 미리 보내기"로 고객과 똑같은 메일을 먼저 받아 보고,
 * "고객에게 보내기"는 받는 사람을 서버가 이 첨삭의 계정 메일로 정한다(직접 입력 없음).
 */
export function ExtraReviewSend({ runId, previewId, ownerEmail, sentToOwner }: { runId: string; previewId: string; ownerEmail: string; sentToOwner: number }) {
  const router = useRouter();
  // Remembered per admin browser; the server render has no storage, so the field fills in on the client.
  const [previewEmail, setPreviewEmail] = useState(() => { try { return typeof window === "undefined" ? "" : localStorage.getItem(PREVIEW_EMAIL_KEY) ?? ""; } catch { return ""; } });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function send(target: { to: string } | { toOwner: true }, label: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/meensoo/second-review-delivery", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, previewId, ...target, expires: Date.now() + LINK_DAYS * 24 * 3600 * 1000, requestId: crypto.randomUUID(), send: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error ?? "SEND_FAILED");
      setMessage(`${label} 완료 · 링크는 ${LINK_DAYS}일 동안 열 수 있습니다.`);
      router.refresh();
    } catch (error) {
      setMessage(`보내지 못했습니다 (${error instanceof Error ? error.message : "SEND_FAILED"}). 같은 버튼을 다시 눌러 주세요.`);
    } finally { setBusy(false); }
  }

  function sendToMe() {
    const to = previewEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { setMessage("미리 받을 메일 주소를 확인해 주세요."); return; }
    try { localStorage.setItem(PREVIEW_EMAIL_KEY, to); } catch { /* storage unavailable */ }
    void send({ to }, "미리 보내기");
  }
  function sendToCustomer() {
    const warning = sentToOwner > 0 ? `\n이 고객에게 이미 ${sentToOwner}번 보냈습니다.` : "";
    if (!window.confirm(`${ownerEmail} 에게 추가 첨삭본을 보낼까요?${warning}`)) return;
    void send({ toOwner: true }, "고객 발송");
  }

  return <div className={styles.send}>
    <label>미리 받을 메일<input type="email" suppressHydrationWarning value={previewEmail} onChange={event => setPreviewEmail(event.target.value)} placeholder="운영자 메일" /></label>
    <button type="button" disabled={busy} onClick={sendToMe}>나에게 미리 보내기</button>
    <button type="button" className={styles.primary} disabled={busy} onClick={sendToCustomer}>고객에게 보내기</button>
    {message && <p role="status">{message}</p>}
  </div>;
}
