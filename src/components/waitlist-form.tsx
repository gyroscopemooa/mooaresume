"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import styles from "./waitlist-form.module.css";

type Status = "idle" | "submitting" | "done" | "error";

export function WaitlistForm({ submitLabel = "출시 알림 받기" }: { submitLabel?: string } = {}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setError("");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "신청 중 오류가 발생했습니다.");
      }
      setStatus("done");
    } catch (reason) {
      setStatus("error");
      setError(reason instanceof Error ? reason.message : "신청 중 오류가 발생했습니다.");
    }
  }

  if (status === "done") {
    return (
      <div className={styles.done}>
        <CheckCircle2 />
        <div>
          <b>신청이 완료되었습니다.</b>
          <p>정식 출시 소식을 가장 먼저 이메일로 알려드릴게요.</p>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <Mail />
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="이메일 주소를 입력해 주세요"
        />
      </label>
      <button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "신청 중..." : submitLabel} <ArrowRight />
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
