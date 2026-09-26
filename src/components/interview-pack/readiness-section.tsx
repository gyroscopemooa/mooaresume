"use client";

import {
  CONFLICT_TOPIC_LABEL,
  PACK_SLOTS,
  READINESS_LABEL,
  type PackSlotId,
} from "@/domain/interview-pack";
import type { PackState } from "@/server/interview-pack/service";
import { PACK_COPY, READINESS_TONE } from "./copy";
import styles from "./interview-pack.module.css";

export type ConfirmDraft = { choice: "left" | "right" | "custom" | ""; customText: string };

type Props = {
  state: PackState;
  /** 문항 보완 질문에 대한 답 초안. 키는 `${slot}::${question}` */
  slotAnswerDrafts: Record<string, string>;
  onSlotAnswer: (slot: PackSlotId, question: string, value: string) => void;
  confirmDrafts: Record<string, ConfirmDraft>;
  onConfirmDraft: (conflictId: string, draft: ConfirmDraft) => void;
  disabled: boolean;
};

const answerKey = (slot: string, question: string) => `${slot}::${question}`;

/** 원문 문단에서 인용 부분을 표시해 어느 부분이 어긋나는지 바로 보이게 한다. */
function Quote({ paragraph, quote }: { paragraph: string; quote: string }) {
  const index = paragraph.indexOf(quote);
  if (index < 0) return <>{paragraph}</>;
  return <>{paragraph.slice(0, index)}<mark>{quote}</mark>{paragraph.slice(index + quote.length)}</>;
}

export function ReadinessSection({ state, slotAnswerDrafts, onSlotAnswer, confirmDrafts, onConfirmDraft, disabled }: Props) {
  const assessment = state.assessment;

  return <section className={styles.section} aria-labelledby="pack-readiness">
    <h3 id="pack-readiness">② {PACK_COPY.readinessTitle}</h3>
    <p className={styles.hint}>{PACK_COPY.readinessNote}</p>

    {!assessment && <p className={styles.empty}>아직 점검하지 않았어요. 아래 ‘자료 점검하기’를 누르면 문항마다 자료가 충분한지 살펴봅니다. {PACK_COPY.checkExplain}</p>}

    {assessment?.stale && <p className={styles.msg} data-kind="notice" role="status">자료를 바꾼 뒤 아직 다시 점검하지 않았어요. 아래 결과는 이전 자료 기준입니다.</p>}

    {assessment && assessment.conflicts.length > 0 && <>
      <div className={styles.subhead}>서류 사이 다른 내용 {assessment.unresolvedConflictCount > 0 ? `· 확인 필요 ${assessment.unresolvedConflictCount}건` : "· 모두 확인함"}</div>
      <p className={styles.hint}>같은 일을 두고 서류마다 다르게 적힌 부분입니다. 어느 쪽이 맞는지 정해 주시기 전에는 그 값을 답변에 쓰지 않아요.</p>
      {assessment.conflicts.map((conflict) => {
        const draft = confirmDrafts[conflict.id] ?? { choice: "", customText: "" };
        const storedChoice = state.materials.confirmations.find((entry) => entry.conflictId === conflict.id);
        return <div className={styles.conflict} key={conflict.id}>
          <h4>{CONFLICT_TOPIC_LABEL[conflict.topic]}이(가) 서로 다릅니다</h4>
          <p className={styles.reason}>{conflict.summary}</p>
          <div className={styles.sides}>
            <div className={styles.side}><small>{conflict.left.docTitle} (문단 {conflict.left.paragraph + 1})</small><Quote paragraph={conflict.left.paragraphText} quote={conflict.left.quote} /></div>
            <div className={styles.side}><small>{conflict.right.docTitle} (문단 {conflict.right.paragraph + 1})</small><Quote paragraph={conflict.right.paragraphText} quote={conflict.right.quote} /></div>
          </div>
          {conflict.resolved
            ? <p className={styles.resolved}>확인함 — {storedChoice?.choice === "left" ? "왼쪽 내용이 맞습니다" : storedChoice?.choice === "right" ? "오른쪽 내용이 맞습니다" : "직접 입력한 내용을 기준으로 합니다"}{storedChoice?.customText ? `: ${storedChoice.customText}` : ""}</p>
            : <fieldset className={styles.choices} disabled={disabled} style={{ border: 0, padding: 0, margin: "10px 0 0" }}>
              <legend className={styles.fieldLabel}>어느 쪽이 맞나요?</legend>
              <label><input type="radio" name={`conf-${conflict.id}`} checked={draft.choice === "left"} onChange={() => onConfirmDraft(conflict.id, { ...draft, choice: "left" })} /> 왼쪽이 맞아요</label>
              <label><input type="radio" name={`conf-${conflict.id}`} checked={draft.choice === "right"} onChange={() => onConfirmDraft(conflict.id, { ...draft, choice: "right" })} /> 오른쪽이 맞아요</label>
              <label><input type="radio" name={`conf-${conflict.id}`} checked={draft.choice === "custom"} onChange={() => onConfirmDraft(conflict.id, { ...draft, choice: "custom" })} /> 둘 다 아니에요 (직접 입력)</label>
              {draft.choice === "custom" && <input type="text" aria-label="직접 입력한 정확한 내용" value={draft.customText} onChange={(event) => onConfirmDraft(conflict.id, { ...draft, customText: event.target.value })} placeholder="정확한 내용을 적어 주세요" maxLength={600} />}
            </fieldset>}
        </div>;
      })}
    </>}

    {assessment && <ul className={styles.slots}>
      {PACK_SLOTS.map((def) => {
        const slot = assessment.slots.find((entry) => entry.slot === def.id);
        if (!slot) return null;
        return <li className={styles.slot} key={def.id}>
          <div className={styles.slotTop}>
            <strong>{def.label}</strong>
            <span className={styles.badge} data-tone={READINESS_TONE[slot.status]}>{READINESS_LABEL[slot.status]}</span>
          </div>
          <p className={styles.reason}>{slot.reason}</p>
          {slot.status === "needs_material" && slot.questions.length > 0 && <div className={styles.questions}>
            {slot.questions.map((question, index) => {
              const id = `q-${def.id}-${index}`;
              return <div key={question}>
                <label htmlFor={id}>{question}</label>
                <textarea id={id} value={slotAnswerDrafts[answerKey(def.id, question)] ?? state.materials.slotAnswers.find((entry) => entry.slot === def.id && entry.question === question)?.answer ?? ""} onChange={(event) => onSlotAnswer(def.id, question, event.target.value)} disabled={disabled} maxLength={1200} rows={2} placeholder="짧게 적어 주세요. 없는 내용은 적지 않으셔도 됩니다." />
              </div>;
            })}
          </div>}
        </li>;
      })}
    </ul>}
  </section>;
}
