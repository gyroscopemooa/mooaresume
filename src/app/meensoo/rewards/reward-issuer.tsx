"use client";

import { FormEvent, useState } from "react";
import { buildClaimUrl, REWARD_REASON_LABEL, rewardCreditProductSchema, rewardCreditReasonSchema } from "@/domain/reward-credit";
import styles from "../admin.module.css";

const PRODUCTS = rewardCreditProductSchema.options;
const REASONS = rewardCreditReasonSchema.options;

/**
 * Issues credits and hands back the links to paste into a mail.
 *
 * Deliberately does not send the mail itself. The composer next door already
 * does that well, and wiring the two together would mean one button that both
 * grants money and sends to fifty people — the kind of thing an operator wants
 * to look at once before it goes out.
 */
export function RewardIssuer({ siteUrl }: { siteUrl: string }) {
  const [to, setTo] = useState("");
  const [product, setProduct] = useState<string>("QUICK");
  const [reason, setReason] = useState<string>("LAUNCH_EVENT");
  const [note, setNote] = useState("");
  const [allowedCharacters, setAllowedCharacters] = useState(20_000);
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [issued, setIssued] = useState<Array<{ email: string; token: string }>>([]);

  async function issue(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/meensoo/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, product, reason, note, allowedCharacters, expiresAt }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || "이용권을 발급하지 못했습니다.");
      return;
    }
    setIssued(result.issued ?? []);
    setMessage(`${result.issued?.length ?? 0}명에게 발급했습니다. 아래 링크를 메일로 보내세요.`);
    setTo("");
  }

  const links = issued.map((item) => `${item.email}\t${buildClaimUrl(siteUrl, item.token)}`).join("\n");

  return (
    <form className={styles.form} onSubmit={issue}>
      <label>
        받는 사람 <small>여러 명은 쉼표·세미콜론·줄바꿈으로 구분, 최대 50명</small>
        <textarea value={to} onChange={(event) => setTo(event.target.value)} rows={3} placeholder="abc@naver.com, def@gmail.com" required />
      </label>
      <label>
        상품
        <select value={product} onChange={(event) => setProduct(event.target.value)}>
          {PRODUCTS.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        지급 사유
        <select value={reason} onChange={(event) => setReason(event.target.value)}>
          {REASONS.map((value) => <option key={value} value={value}>{REWARD_REASON_LABEL[value]}</option>)}
        </select>
      </label>
      <label>
        메모 <small>선택 · 나중에 왜 줬는지 알아보기 위한 기록</small>
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="예: 8월 런칭 이벤트 신청자" />
      </label>
      <label>
        분석 가능 글자 수 <small>유료와 같은 상한을 씁니다</small>
        <input type="number" min={1000} max={100000} step={1000} value={allowedCharacters} onChange={(event) => setAllowedCharacters(Number(event.target.value) || 20_000)} />
      </label>
      <label>
        만료일 <small>비워두면 기한 없음</small>
        <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
      </label>
      <button disabled={busy}>{busy ? "발급 중..." : "이용권 발급"}</button>
      {message && <p className={styles.formMessage}>{message}</p>}
      {issued.length > 0 && (
        <label>
          수령 링크 <small>주소와 링크가 탭으로 구분됩니다. 그대로 복사해 메일에 넣으세요</small>
          <textarea readOnly rows={Math.min(issued.length + 1, 12)} value={links} onFocus={(event) => event.target.select()} />
        </label>
      )}
    </form>
  );
}
