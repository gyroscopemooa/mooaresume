"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

/**
 * Reuses `/api/mail/login`, which already issues the admin cookie at path "/".
 * One password opens both this console and the original `/MAIL` screen, and
 * that route is left exactly as it was.
 */
export function AdminLogin() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/mail/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    });
    setBusy(false);
    if (!response.ok) {
      setMessage("비밀번호가 맞지 않습니다.");
      return;
    }
    // The gate is checked on the server, so the page has to be re-fetched
    // rather than flipped with local state.
    router.refresh();
  }

  return (
    <main className={styles.login}>
      <section className={styles.loginCard}>
        <h1>MOOA 관리자</h1>
        <p>구매·첨삭·메일 기록을 보는 화면입니다.</p>
        <form onSubmit={submit}>
          <label>
            접속 비밀번호
            <input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoFocus autoComplete="current-password" />
          </label>
          <button disabled={busy}>{busy ? "확인 중..." : "들어가기"}</button>
        </form>
        {message && <p className={styles.loginMessage}>{message}</p>}
      </section>
    </main>
  );
}
