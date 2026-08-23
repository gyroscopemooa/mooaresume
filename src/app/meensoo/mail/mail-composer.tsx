"use client";

import { FormEvent, useState } from "react";
import styles from "../admin.module.css";

/**
 * The same send flow as `/MAIL`, on the console's own gate and styling.
 *
 * `/MAIL` is left in place and still works; this is a second entrance to the
 * one `/api/mail/send` route, not a replacement for it.
 */
export function MailComposer() {
  const [to, setTo] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function send(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/mail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, replyTo, subject, body }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(result.error || "메일을 보내지 못했습니다.");
      return;
    }
    if (result.failedRecipients?.length) {
      setMessage(`${result.sent}명에게 보냈습니다. 실패: ${result.failedRecipients.join(", ")}`);
      return;
    }
    setMessage(`${result.sent}명에게 보냈습니다.`);
    // Only cleared on a clean send: with failures on the list, the operator
    // needs the addresses still there to trim and retry.
    setTo("");
    setSubject("");
    setBody("");
  }

  return (
    <form className={styles.form} onSubmit={send}>
      <label>
        받는 사람 <small>여러 명은 쉼표·세미콜론·줄바꿈으로 구분, 최대 50명</small>
        <textarea value={to} onChange={(event) => setTo(event.target.value)} rows={3} placeholder="담당자@학교.ac.kr, 담당자2@학교.ac.kr" required />
      </label>
      <label>
        회신 받을 주소 <small>비워두면 기본 회신 주소로 갑니다</small>
        <input type="email" value={replyTo} onChange={(event) => setReplyTo(event.target.value)} placeholder="다른 주소로 답장을 받고 싶을 때만 입력" />
      </label>
      <label>
        제목
        <input value={subject} onChange={(event) => setSubject(event.target.value)} required />
      </label>
      <label>
        본문
        <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={14} placeholder="안녕하세요..." required />
      </label>
      <button disabled={busy}>{busy ? "보내는 중..." : "메일 보내기"}</button>
      {message && <p className={styles.formMessage}>{message}</p>}
    </form>
  );
}
