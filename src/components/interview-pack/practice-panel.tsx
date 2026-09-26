"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PackCard } from "@/domain/interview-pack";
import {
  compactLength,
  estimateSeconds,
  formatSeconds,
  personalSecondsPerChar,
  splitSentences,
} from "@/domain/interview-pack-text";
import { PACK_COPY } from "./copy";
import { appendPracticeRecord, clearPracticeRecords, readPracticeRecords, type PracticeRecord } from "./practice-records";
import styles from "./interview-pack.module.css";

/**
 * 키워드 암기와 시간 연습.
 *
 *  [전체 답변] → [핵심 문장] → [키워드만] → [힌트 없이 말하기]
 *
 * 이 화면의 어떤 동작(단계 이동·키워드 펼치기·힌트 보기·타이머·복사)도 AI 를 부르지 않는다.
 * 저장된 답변을 보여 주고 브라우저 안에서만 움직인다. 카메라·마이크·녹음·음성 인식은 없다.
 */

const STAGES = ["전체 답변", "핵심 문장", "키워드만", "힌트 없이 말하기"] as const;

type Props = {
  packId: string;
  slot: string;
  slotLabel: string;
  targetSeconds: number;
  targetLabel: string;
  card: PackCard;
  /** 답변이 내 속도로 너무 길 때 "조금 줄이기" 를 누르면 부른다. 없으면 버튼을 숨긴다. */
  onShorten?: () => void;
  shortenDisabledReason?: string | null;
  onClose: () => void;
};

export function PracticePanel({ packId, slot, slotLabel, targetSeconds, targetLabel, card, onShorten, shortenDisabledReason, onClose }: Props) {
  const [stage, setStage] = useState(0);
  const [openKeywords, setOpenKeywords] = useState<Set<number>>(new Set());
  const [hintShown, setHintShown] = useState(false);
  const [records, setRecords] = useState<PracticeRecord[]>(() => readPracticeRecords(packId, slot));
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef<number | null>(null);

  const sentences = useMemo(() => splitSentences(card.answer), [card.answer]);
  const chars = useMemo(() => compactLength(card.answer), [card.answer]);

  // 타이머: 시작 시각과의 차이로 계산해 탭이 느려져도 어긋나지 않는다.
  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      if (startedAt.current !== null) setElapsedMs(Date.now() - startedAt.current);
    }, 200);
    return () => window.clearInterval(timer);
  }, [running]);

  function start() {
    startedAt.current = Date.now();
    setElapsedMs(0);
    setRunning(true);
  }

  function stop() {
    if (startedAt.current === null) return;
    const seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    startedAt.current = null;
    setRunning(false);
    setElapsedMs(seconds * 1000);
    setRecords(appendPracticeRecord(packId, slot, { seconds, chars, at: new Date().toISOString() }));
  }

  function restart() {
    startedAt.current = Date.now();
    setElapsedMs(0);
    setRunning(true);
  }

  function toggleKeyword(index: number) {
    setOpenKeywords((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const last = records.at(-1) ?? null;
  const perChar = personalSecondsPerChar(records);
  const estimated = perChar === null ? null : estimateSeconds(chars, perChar);
  const tooLong = estimated !== null && estimated > targetSeconds * 1.15;

  return <div className={styles.practice} role="region" aria-label={`${slotLabel} 연습`}>
    <div className={styles.cardHead}>
      <h4>{slotLabel} 연습</h4>
      <button type="button" className={styles.btn} data-variant="quiet" data-size="sm" onClick={onClose}>연습 닫기</button>
    </div>

    <ol className={styles.stageTabs} aria-label="연습 단계">
      {STAGES.map((label, index) => <li key={label}>
        <button type="button" aria-current={stage === index ? "step" : undefined} onClick={() => setStage(index)}>{index + 1}. {label}</button>
      </li>)}
    </ol>

    <div className={styles.stageBody}>
      {stage === 0 && <>
        <p className={styles.body}>{card.answer}</p>
        <p className={styles.hint}>먼저 소리 내어 읽으며 흐름을 익혀 보세요.</p>
      </>}

      {stage === 1 && <>
        <ol className={styles.orderList}>
          {card.steps.map((step) => <li key={`${step.label}-${step.sentence}`}><b>{step.label}</b> — {step.sentence}</li>)}
        </ol>
        <p className={styles.hint}>말하는 순서대로 핵심 문장만 보면서 이어 말해 보세요.</p>
      </>}

      {stage === 2 && <>
        <ul className={styles.chips}>
          {card.keywords.map((keyword, index) => <li key={keyword.text}>
            <button type="button" className={styles.chip} aria-pressed={openKeywords.has(index)} onClick={() => toggleKeyword(index)} disabled={keyword.sentenceIndex === null}>
              {keyword.text}
            </button>
          </li>)}
        </ul>
        {card.keywords.some((_, index) => openKeywords.has(index)) && <ul className={styles.followList}>
          {card.keywords.map((keyword, index) => openKeywords.has(index) && keyword.sentenceIndex !== null
            ? <li key={keyword.text}><b>{keyword.text}</b> → {sentences[keyword.sentenceIndex] ?? ""}</li>
            : null)}
        </ul>}
        <p className={styles.hint}>키워드를 눌러 그 키워드가 들어 있는 문장을 펼쳐 보고, 문장을 떠올려 말해 보세요. 다시 누르면 접힙니다.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} data-variant="quiet" data-size="sm" onClick={() => setOpenKeywords(new Set())}>모두 접기</button>
        </div>
      </>}

      {stage === 3 && <>
        <div className={styles.blank}>답변을 보지 않고 말해 보세요</div>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} data-variant="ghost" data-size="sm" aria-pressed={hintShown} onClick={() => setHintShown((value) => !value)}>
            {hintShown ? "힌트 다시 숨기기" : "힌트 보기"}
          </button>
        </div>
        {hintShown && <>
          <ul className={styles.chips}>{card.keywords.map((keyword) => <li key={keyword.text}><span className={styles.chip}>{keyword.text}</span></li>)}</ul>
          <p className={styles.memory}>{card.memoryLine}</p>
        </>}
      </>}
    </div>

    <div className={styles.timer}>
      <div className={styles.target}>{targetLabel} · {last ? `마지막으로 잰 시간 ${formatSeconds(last.seconds)}` : "아직 측정하지 않음"}</div>
      <div className={styles.clock} aria-live="off">{formatSeconds(elapsedMs / 1000)}</div>
      <div className={styles.actions}>
        {!running && <button type="button" className={styles.btn} data-size="sm" onClick={start}>시작</button>}
        {running && <button type="button" className={styles.btn} data-size="sm" onClick={stop}>정지</button>}
        <button type="button" className={styles.btn} data-variant="quiet" data-size="sm" onClick={restart} disabled={!running && elapsedMs === 0}>다시 시작</button>
        {records.length > 0 && <button type="button" className={styles.btn} data-variant="quiet" data-size="sm" onClick={() => { clearPracticeRecords(packId, slot); setRecords([]); setElapsedMs(0); }}>기록 지우기</button>}
      </div>
      <p className={styles.timerNote}>{PACK_COPY.timerNote}</p>
      {records.length > 0 && <ul className={styles.records}>
        {records.map((record) => <li key={record.at}>내가 잰 시간 {formatSeconds(record.seconds)} · {new Date(record.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</li>)}
      </ul>}
      {estimated !== null && <p className={styles.estimate}>
        내가 잰 기록의 중앙값으로 어림하면 이 답변은 읽는 데 약 {formatSeconds(estimated)}이 걸립니다(참고용 어림이며 자동 분석이 아닙니다).
        {tooLong && <> 목표보다 길어 보여요. </>}
        {tooLong && onShorten && <button type="button" className={styles.btn} data-variant="ghost" data-size="sm" onClick={onShorten} disabled={Boolean(shortenDisabledReason)}>조금 줄이기</button>}
        {tooLong && shortenDisabledReason && <> {shortenDisabledReason}</>}
      </p>}
    </div>
  </div>;
}
