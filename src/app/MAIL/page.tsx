"use client";

import { FormEvent, useState } from "react";
import styles from "./mail.module.css";

export default function MailPage() {
  const [loggedIn, setLoggedIn] = useState(false); const [secret, setSecret] = useState(""); const [to, setTo] = useState(""); const [replyTo, setReplyTo] = useState(""); const [subject, setSubject] = useState(""); const [body, setBody] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function login(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); const response = await fetch("/api/mail/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret }) }); setBusy(false); if (response.ok) { setLoggedIn(true); setMessage("메일 작성 화면에 들어왔습니다."); } else setMessage("접속 비밀번호가 맞지 않습니다."); }
  async function send(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); const response = await fetch("/api/mail/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, replyTo, subject, body }) }); const result = await response.json().catch(() => ({})); setBusy(false); setMessage(!response.ok
      ? result.error || "메일을 보내지 못했습니다."
      : result.failedRecipients?.length
        ? `${result.sent}명에게 보냈습니다. 실패: ${result.failedRecipients.join(", ")}`
        : `${result.sent}명에게 보냈습니다.`); if (response.ok && !result.failedRecipients?.length) { setTo(""); setSubject(""); setBody(""); } }
  if (!loggedIn) return <main className={styles.page}><section className={styles.card}><span className={styles.eyebrow}>MOOA MAIL</span><h1>메일 보내기</h1><p>관리자 전용 발송 화면입니다.</p><form onSubmit={login}><label>접속 비밀번호<input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoFocus /></label><button disabled={busy}>{busy ? "확인 중..." : "들어가기"}</button></form>{message && <p className={styles.message}>{message}</p>}</section></main>;
  return <main className={styles.page}><section className={styles.card}><span className={styles.eyebrow}>MOOA MAIL</span><h1>메일 작성</h1><p>Resend에 등록한 발신 주소로 보냅니다.</p><form onSubmit={send}><label>받는 사람 <small>여러 명은 쉼표로 구분</small><textarea value={to} onChange={(event) => setTo(event.target.value)} rows={2} placeholder="담당자@학교.ac.kr, 담당자2@학교.ac.kr" required /></label><label>회신 받을 주소 <small>비워두면 기본 회신 주소로 갑니다</small><input type="email" value={replyTo} onChange={(event) => setReplyTo(event.target.value)} placeholder="다른 주소로 답장을 받고 싶을 때만 입력" /></label><label>제목<input value={subject} onChange={(event) => setSubject(event.target.value)} required /></label><label>본문<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={14} placeholder="안녕하세요..." required /></label><button disabled={busy}>{busy ? "보내는 중..." : "메일 보내기"}</button></form>{message && <p className={styles.message}>{message}</p>}</section></main>;
}
