"use client";

import { Lightbulb } from "lucide-react";
import { suggestConnectorMerges } from "@/domain/result-document";
import styles from "./connector-merge-hint.module.css";

const PREVIEW_LENGTH = 24;

/**
 * 최종 첨삭본 밑에 붙는 선택 제안. 첨삭 결과는 그대로 두고, "또한 ~" 한 줄이 혼자 떨어져
 * 있을 때만 붙여 쓰는 방법과 이유를 알려 준다. 고칠지는 지원자가 고르며, 안 고쳐도 된다.
 */
export function ConnectorMergeHint({
  answer,
  applied,
  onApply,
  onUndo,
}: {
  answer: string;
  /** 방금 이 제안을 적용해서 되돌릴 수 있는 상태. */
  applied: boolean;
  onApply: (resultText: string) => void;
  onUndo: () => void;
}) {
  const suggestion = applied ? undefined : suggestConnectorMerges(answer)[0];

  if (applied) {
    return (
      <p className={styles.applied}>
        <Lightbulb aria-hidden="true" />
        <span>한 줄을 다음 문단에 붙였어요. 복사·저장에도 이 모습으로 담겨요.</span>
        <button type="button" onClick={onUndo}>되돌리기</button>
      </p>
    );
  }
  if (!suggestion) return null;

  const leadPreview = suggestion.lead.length > PREVIEW_LENGTH ? `${suggestion.lead.slice(0, PREVIEW_LENGTH)}…` : suggestion.lead;
  return (
    <aside className={styles.hint} aria-label="작성 팁, 선택 사항">
      <b className={styles.title}><Lightbulb aria-hidden="true" />작성 팁 · 선택 사항</b>
      <p className={styles.body}>
        “{leadPreview}” 한 줄이 따로 떨어져 있어요. 접속어 “{suggestion.connector}” 없이 다음 문단 맨 앞에 붙이면 주장과 근거가 한 문단으로 이어져 읽는 사람이 흐름을 잡기 쉬워요.
        <span className={styles.respect}> 지금 그대로도 괜찮으니 선택은 자유예요.</span>
      </p>
      <details className={styles.preview}>
        <summary>붙인 모습 보기</summary>
        <p>{suggestion.merged}</p>
      </details>
      <div className={styles.actions}>
        <button type="button" className={styles.apply} onClick={() => onApply(suggestion.resultText)}>이렇게 바꾸기</button>
      </div>
    </aside>
  );
}
