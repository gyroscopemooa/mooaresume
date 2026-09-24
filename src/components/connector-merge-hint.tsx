"use client";

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { suggestConnectorMerges, type ConnectorMergeSuggestion } from "@/domain/result-document";
import styles from "./connector-merge-hint.module.css";

const PREVIEW_LENGTH = 24;
const CACHE_PREFIX = "mooa:style-tip:v1:";

// 같은 글이면 몇 번을 열어도 설명이 바뀌지 않게, 받은 설명은 이 브라우저에 한 번만 저장해 둔다.
function readCachedTip(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeCachedTip(key: string, text: string) {
  try {
    window.localStorage.setItem(key, text);
  } catch {
    // 저장이 막힌 브라우저에서는 열 때마다 새로 받을 뿐 화면은 정상이다.
  }
}

function hashText(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
  return (hash >>> 0).toString(36);
}

// 같은 카드가 동시에 두 번 요청하지 않도록(개발 모드의 이중 실행 포함) 진행 중인 요청을 나눠 쓴다.
const pending = new Map<string, Promise<string | null>>();

function requestTip(key: string, analysisRunId: string, questionId: string, lead: string): Promise<string | null> {
  const running = pending.get(key);
  if (running) return running;
  const request = fetch("/api/result/style-tip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysisRunId, questionId, lead }),
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const data: unknown = await response.json();
      const explanation = typeof data === "object" && data !== null ? (data as { explanation?: unknown }).explanation : null;
      return typeof explanation === "string" && explanation.trim() ? explanation.trim() : null;
    })
    .catch(() => null)
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

/**
 * 컨설턴트식 설명을 서버에서 받아 온다. 받는 동안과 실패했을 때는 null이라 화면은 고정 문구로
 * 보이고, 설명이 오면 그 문구 자리만 바뀐다. 결과가 저장되지 않은 화면(샘플)에서는 요청하지 않는다.
 */
function useConnectorTip(analysisRunId: string | null, questionId: string, suggestion: ConnectorMergeSuggestion | undefined): string | null {
  const [tip, setTip] = useState<{ key: string; text: string } | null>(null);
  const lead = suggestion?.lead;
  const key = analysisRunId && suggestion ? `${CACHE_PREFIX}${analysisRunId}:${questionId}:${hashText(`${suggestion.lead}\n${suggestion.next}`)}` : null;

  useEffect(() => {
    if (!key || !analysisRunId || !lead) return;
    let cancelled = false;
    void (async () => {
      const cached = readCachedTip(key);
      const text = cached ?? await requestTip(key, analysisRunId, questionId, lead);
      if (!text || cancelled) return;
      if (!cached) writeCachedTip(key, text);
      setTip({ key, text });
    })();
    return () => {
      cancelled = true;
    };
  }, [key, analysisRunId, questionId, lead]);

  return key && tip?.key === key ? tip.text : null;
}

/**
 * 최종 첨삭본 밑에 붙는 선택 제안. 첨삭 결과는 그대로 두고, "또한 ~" 한 줄이 혼자 떨어져
 * 있을 때만 붙여 쓰는 방법과 이유를 알려 준다. 고칠지는 지원자가 고르며, 안 고쳐도 된다.
 *
 * 어디에 제안할지는 언제나 같은 규칙(`suggestConnectorMerges`)이 정하고, 이유 문장만 AI가 글의
 * 실제 내용으로 써 준다. 설명을 못 받으면 고정 문구가 그 자리를 채운다.
 */
export function ConnectorMergeHint({
  answer,
  analysisRunId,
  questionId,
  applied,
  onApply,
  onUndo,
}: {
  answer: string;
  /** 저장된 결과의 실행 번호. 없으면(샘플 등) AI 설명을 요청하지 않는다. */
  analysisRunId: string | null;
  questionId: string;
  /** 방금 이 제안을 적용해서 되돌릴 수 있는 상태. */
  applied: boolean;
  onApply: (resultText: string) => void;
  onUndo: () => void;
}) {
  const suggestion = applied ? undefined : suggestConnectorMerges(answer)[0];
  const tip = useConnectorTip(analysisRunId, questionId, suggestion);

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
      <p className={styles.body} data-tip={tip ? "ai" : "template"}>
        “{leadPreview}” 한 줄이 따로 떨어져 있어요. 접속어 “{suggestion.connector}” 없이 다음 문단 맨 앞에 붙여 볼 수 있어요.{" "}
        {tip ?? "그러면 주장과 근거가 한 문단으로 이어져 읽는 사람이 흐름을 잡기 쉬워요."}
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
