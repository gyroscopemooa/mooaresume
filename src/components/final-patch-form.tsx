"use client";

import { useState } from "react";
import type { PatchQuestion } from "@/domain/final-patch";
import styles from "./final-wrap-up.module.css";

/**
 * 제출 전 보완.
 *
 * 물어보는 것은 **저희가 답을 모르는 것뿐**입니다. 이력서와 자소서 중 어느
 * 수치가 맞는지, 그 서비스가 실제로 돌아가는지 — 채워 넣으면 지어내기가 되므로
 * 여기서 한 번 여쭙습니다.
 *
 * 답하시면 그 문장만 다시 씁니다. 나머지 문장은 모델이 보지도 않으므로 흔들릴
 * 수가 없고, 원래 첨삭본도 그대로 남습니다.
 */

type Patch = { itemId: string; questionId: string; before: string; after: string };

export function FinalPatchForm({ analysisRunId, questions }: { analysisRunId: string | null; questions: PatchQuestion[] }) {
  const answerable = questions.filter((question) => question.questionId);
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [patches, setPatches] = useState<Patch[] | null>(null);

  if (answerable.length === 0 || !analysisRunId) return null;

  const filled = answerable.filter((question) => (answers[question.itemId] ?? "").trim());

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/final-patch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          analysisRunId,
          answers: filled.map((question) => ({ itemId: question.itemId, answer: (answers[question.itemId] ?? "").trim() })),
        }),
      });
      const body = await response.json().catch(() => ({})) as { patches?: Patch[]; error?: string; saved?: boolean };
      if (!response.ok) { setMessage(body.error ?? `보완하지 못했습니다. (${response.status})`); return; }
      setPatches(body.patches ?? []);
      setMessage(body.saved === false ? "고쳤지만 저장하지 못했습니다. 아래 문장을 복사해 두세요." : "");
    } catch {
      setMessage("보완하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (patches) {
    return (
      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h3>보완했습니다</h3>
          <b>{patches.length}</b>
          <p>알려 주신 사실로 아래 문장만 다시 썼습니다. 나머지 문장과 원래 첨삭본은 그대로입니다.</p>
        </div>
        {message && <p className={styles.patchMessage}>{message}</p>}
        {patches.length === 0 ? (
          <p className={styles.empty}>바꿀 만한 것이 없다고 판단했습니다. 원래 문장을 그대로 두었습니다.</p>
        ) : (
          <ul className={styles.items}>
            {patches.map((patch) => (
              <li key={patch.itemId} className={styles.item}>
                <p className={styles.before}>{patch.before}</p>
                <p className={styles.after}>{patch.after}</p>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className={styles.ghostButton} onClick={() => { setPatches(null); setMessage(""); }}>
          다시 답하기
        </button>
      </section>
    );
  }

  if (!open) {
    return (
      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h3>제출 전 보완</h3>
          <b>{answerable.length}</b>
          <p>
            저희가 임의로 판단할 수 없는 {answerable.length}가지만 확인해 주세요.
            답해 주시면 <b>그 문장만</b> 다시 씁니다 — 자기소개서를 다시 쓰지 않고, 원래 첨삭본도 그대로 둡니다.
          </p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={() => setOpen(true)}>
          {answerable.length}가지 확인하기
        </button>
      </section>
    );
  }

  return (
    <section className={styles.group}>
      <div className={styles.groupHead}>
        <h3>제출 전 보완</h3>
        <b>{filled.length} / {answerable.length}</b>
        <p>모두 답하지 않으셔도 됩니다. 답한 것만 고칩니다.</p>
      </div>

      <ul className={styles.items}>
        {answerable.map((question, index) => (
          <li key={question.itemId} className={styles.item}>
            <div className={styles.itemTop}>
              <span className={styles.from}>{index + 1} / {answerable.length}</span>
            </div>
            <b>{question.headline}</b>
            <p className={styles.quote}>{question.quote}</p>

            {/* 두 문서가 다르게 적은 경우에는 빈칸보다 고르는 편이 정확합니다. */}
            {question.choices.length > 0 && (
              <div className={styles.choices}>
                {question.choices.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    data-selected={answers[question.itemId] === choice}
                    onClick={() => setAnswers((current) => ({ ...current, [question.itemId]: choice }))}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            )}

            <textarea
              className={styles.answerBox}
              rows={2}
              maxLength={600}
              value={answers[question.itemId] ?? ""}
              onChange={(event) => setAnswers((current) => ({ ...current, [question.itemId]: event.target.value }))}
              placeholder={question.choices.length > 0 ? "위에서 고르시거나, 정확한 내용을 직접 적어 주세요." : "사실만 적어 주세요. 없으면 '근거 없음'이라고 적으셔도 됩니다."}
            />
            <p className={styles.todo}>{question.todo}</p>
          </li>
        ))}
      </ul>

      {message && <p className={styles.patchMessage}>{message}</p>}
      <div className={styles.formFoot}>
        <button type="button" className={styles.ghostButton} onClick={() => setOpen(false)}>닫기</button>
        <button type="button" className={styles.primaryButton} disabled={busy || filled.length === 0} onClick={() => void submit()}>
          {busy ? "고치는 중..." : `${filled.length}곳 보완하기`}
        </button>
      </div>
      <p className={styles.footnote}>
        <b>자기소개서를 다시 쓰지 않습니다.</b> 위에 인용된 문장만 바꾸고, 원래 첨삭본은 그대로 남습니다.
      </p>
    </section>
  );
}
