"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, FileText, Star } from "lucide-react";
import styles from "./feedback-form.module.css";

/**
 * 분석 후기 한 장.
 *
 * 묻지 않는 것을 먼저 정했습니다. **"무엇이 불만이었나"는 묻지 않습니다.**
 * 그 자리에서 나오는 답("별로였다", "수준이 낮다")은 다음에 할 일을 알려주지
 * 않고, 쓴 사람도 답을 받지 못합니다. 대신 "도움이 된 점"과 "더 있었으면
 * 하는 것"을 묻습니다 — 앞의 것은 무엇을 지킬지, 뒤의 것은 무엇을 만들지
 * 그대로 알려 줍니다. 낮은 별점은 별점 자체가 이미 말해 줍니다.
 *
 * 둘 다 선택입니다. 별 하나만 누르고 닫아도 그것은 실패가 아니라 응답입니다.
 */

const WORDS: Record<number, string> = {
  1: "많이 아쉬우셨군요. 무엇을 고쳐야 할지 알려주시면 큰 도움이 됩니다.",
  2: "기대에 못 미쳤군요. 어떤 점이었는지 아래에 적어 주세요.",
  3: "보통이셨군요. 한 가지만 나아진다면 무엇일까요?",
  4: "도움이 되었다니 다행입니다.",
  5: "감사합니다. 어떤 점이 좋았는지 알려주시면 그대로 지키겠습니다.",
};

export function FeedbackForm({ analysisRunId, alreadyAnswered }: { analysisRunId: string; alreadyAnswered: boolean }) {
  const [rating, setRating] = useState(0);
  const [helpful, setHelpful] = useState("");
  const [wish, setWish] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(alreadyAnswered);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!rating) { setError("별점을 선택해 주세요."); return; }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          analysisRunId,
          rating,
          helpfulText: helpful.trim() || null,
          wishText: wish.trim() || null,
        }),
      });
      // 이미 남긴 경우는 오류가 아닙니다. 메일을 두 번 여는 것은 흔한 일이고,
      // 여기서 빨간 글씨를 보여 주면 자기가 뭘 잘못한 줄 압니다.
      if (response.status === 409) { setDone(true); return; }
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setDone(true);
    } catch {
      setError("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <div className={styles.done}>
            <div className={styles.doneMark}><Check strokeWidth={3}/></div>
            <h1>{alreadyAnswered ? "이미 후기를 남겨 주셨습니다" : "보내주셔서 감사합니다"}</h1>
            <p>
              적어 주신 내용은 다음 분석을 고치는 데 그대로 씁니다.
              <br />
              더 하실 말씀이 있으면 이 메일에 그대로 답장해 주세요.
            </p>
            <Link href="/" className={styles.homeLink}>무아레쥬메로 돌아가기</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={submit}>
        <span className={styles.brand}><FileText/> 무아레쥬메</span>
        <h1 className={styles.title}>이번 분석, 어떠셨나요?</h1>
        <p className={styles.lead}>
          30초면 됩니다. 별점만 눌러 주셔도 충분하고, 적어 주신 내용은
          다음 분석을 고치는 데 씁니다.
        </p>

        <div className={styles.field} role="group" aria-labelledby="rating-label">
          <span id="rating-label">별점</span>
          <div className={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className={styles.star} data-on={value <= rating}>
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => { setRating(value); setError(""); }}
                />
                <Star aria-hidden />
                <span className={styles.srOnly}>{value}점</span>
              </label>
            ))}
          </div>
          {/* 손가락에 가려 몇 개를 눌렀는지 안 보입니다. 글로도 말해 줍니다. */}
          <p className={styles.ratingWord}>{rating ? WORDS[rating] : ""}</p>
        </div>

        <label className={styles.field}>
          <span>도움이 된 점</span>
          <small>선택 · 그대로 지키겠습니다</small>
          <textarea
            value={helpful}
            onChange={(event) => setHelpful(event.target.value)}
            maxLength={2000}
            placeholder="예: 문항별로 뭘 고쳐야 하는지 콕 집어 준 부분"
          />
        </label>

        <label className={styles.field}>
          <span>더 있었으면 하는 것</span>
          <small>선택 · 원하시는 분석이나 기능을 적어 주세요</small>
          <textarea
            value={wish}
            onChange={(event) => setWish(event.target.value)}
            maxLength={2000}
            placeholder="예: 면접 예상질문도 같이 뽑아 줬으면"
          />
        </label>

        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? "보내는 중..." : "보내기"}
        </button>
        {error ? <p className={styles.error}>{error}</p> : (
          <p className={styles.note}>작성하신 내용은 서비스 개선에만 쓰입니다.</p>
        )}
      </form>
    </main>
  );
}
