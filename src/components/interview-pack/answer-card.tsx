"use client";

import { useEffect, useRef, useState } from "react";
import {
  CARD_ORIGIN_LABEL,
  PACK_DOC_KIND_LABEL,
  getPackSlot,
  type StoredAnswer,
} from "@/domain/interview-pack";
import { compactLength, lengthGuide } from "@/domain/interview-pack-text";
import type { PackState } from "@/server/interview-pack/service";
import { PACK_COPY } from "./copy";
import { PracticePanel } from "./practice-panel";
import styles from "./interview-pack.module.css";

type AnswerView = PackState["answers"][number];
type Mode = "view" | "edit" | "menu" | "history" | "practice";
type ReviseChoice = { kind: string; label: string; custom?: string };

const REVISE_CHOICES: Array<{ kind: string; label: string; introOnly?: boolean }> = [
  { kind: "shorten", label: "조금 줄이기" },
  { kind: "direction_strength", label: "강점·경험 중심으로", introOnly: true },
  { kind: "direction_motivation", label: "지원동기 중심으로", introOnly: true },
  { kind: "direction_aspiration", label: "포부와 연결해서", introOnly: true },
  { kind: "replace_material", label: "바뀐 자료 기준으로 다시" },
];

type Props = {
  packId: string;
  answer: AnswerView;
  editsRemaining: number;
  aiAvailable: boolean;
  busy: boolean;
  onSaveEdit: (slot: string, baseRevision: number, text: string) => Promise<boolean>;
  onRevise: (slot: string, kind: string, customText?: string) => Promise<boolean>;
  onLoadRevisions: (slot: string) => Promise<StoredAnswer[]>;
  onRestore: (slot: string, revisionNo: number, baseRevision: number) => Promise<boolean>;
};

function highlight(paragraph: string, quote: string) {
  const index = paragraph.indexOf(quote);
  if (index < 0) return <>{paragraph}</>;
  return <>{paragraph.slice(0, index)}<mark>{quote}</mark>{paragraph.slice(index + quote.length)}</>;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 클립보드 권한이 없는 환경: 임시 입력 칸을 이용한다.
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function AnswerCard({ packId, answer, editsRemaining, aiAvailable, busy, onSaveEdit, onRevise, onLoadRevisions, onRestore }: Props) {
  const slotDef = getPackSlot(answer.slot);
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState(answer.card.answer);
  const [customText, setCustomText] = useState("");
  const [pending, setPending] = useState<ReviseChoice | null>(null);
  const [history, setHistory] = useState<StoredAnswer[] | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  // 수정 칸은 답변 위쪽에 나오는데, "직접 수정" 버튼은 키워드·근거 아래 있다. 눌러도 아무 일
  // 없는 것처럼 보이지 않도록, 수정 칸이 열리면 그쪽으로 스크롤한다.
  useEffect(() => {
    if (mode === "edit") editorRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [mode]);

  const isIntro = answer.slot === "intro_30" || answer.slot === "intro_60";
  const errors = answer.card.issues.filter((issue) => issue.severity === "error");
  const warnings = answer.card.issues.filter((issue) => issue.severity === "warn");
  const guide = lengthGuide(answer.slot, answer.card.answer);
  const userAuthored = answer.origin === "user_edited" || answer.origin === "restored";
  const reviseBlocked = !aiAvailable ? "AI 기능을 사용할 수 없는 상태입니다." : editsRemaining <= 0 ? "AI 수정 횟수를 모두 사용했습니다. 직접 수정과 이전 버전 복원은 계속할 수 있어요." : null;

  async function handleCopy() {
    const ok = await copyText(answer.card.answer);
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 1500);
  }

  async function openHistory() {
    setMode("history");
    setHistoryBusy(true);
    try {
      setHistory(await onLoadRevisions(answer.slot));
    } finally {
      setHistoryBusy(false);
    }
  }

  async function saveEdit() {
    if (await onSaveEdit(answer.slot, answer.revisionNo, draft)) setMode("view");
  }

  async function runRevise() {
    if (!pending) return;
    const ok = await onRevise(answer.slot, pending.kind, pending.custom);
    if (ok) {
      setPending(null);
      setCustomText("");
      setMode("view");
    }
  }

  return <article className={styles.card} data-incomplete={!answer.complete} aria-label={slotDef.label}>
    <div className={styles.cardHead}>
      <h4>{slotDef.label}</h4>
      <span className={styles.target}>{slotDef.targetLabel} · 공백 제외 {compactLength(answer.card.answer)}자</span>
    </div>
    <div className={styles.badges}>
      <span className={styles.badge} data-tone={answer.complete ? "ok" : "confirm"}>{answer.complete ? "완성 답변" : "확인 필요 초안 · 완성 답변 아님"}</span>
      <span className={styles.badge} data-tone={userAuthored ? "user" : "muted"}>{CARD_ORIGIN_LABEL[answer.origin]}</span>
      {answer.stale && <span className={styles.badge} data-tone="stale">이전 자료 기준</span>}
      {answer.revisionCount > 1 && <span className={styles.badge} data-tone="muted">버전 {answer.revisionNo}</span>}
    </div>

    {mode === "edit"
      ? <div className={styles.editor} ref={editorRef}>
        <label htmlFor={`edit-${answer.slot}`} className={styles.fieldLabel}>직접 수정</label>
        <textarea id={`edit-${answer.slot}`} value={draft} onChange={(event) => setDraft(event.target.value)} rows={7} maxLength={1400} />
        <p className={styles.hint}>저장하면 사용자 수정본으로 표시되고, 키워드·근거 확인 상태가 새 문장에 맞게 다시 계산됩니다. AI 수정 횟수는 쓰지 않습니다.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} data-size="sm" onClick={() => void saveEdit()} disabled={busy || draft.trim() === answer.card.answer.trim()}>저장</button>
          <button type="button" className={styles.btn} data-variant="quiet" data-size="sm" onClick={() => { setDraft(answer.card.answer); setMode("view"); }}>취소</button>
        </div>
      </div>
      : <p className={styles.body}>{answer.card.answer}</p>}

    <p className={styles.length}>
      길이 안내: 목표 {slotDef.targetLabel.replace("목표 ", "")} 기준 공백 제외 약 {guide.minChars}~{guide.maxChars}자 —{" "}
      {guide.state === "fit" ? "알맞은 길이로 보여요" : guide.state === "long" ? "조금 길어 보여요" : "조금 짧아 보여요"}. {PACK_COPY.lengthNote}
    </p>

    {(errors.length > 0 || warnings.length > 0) && <ul className={styles.issues} data-severity={errors.length > 0 ? "error" : "warn"} aria-label="자동 점검 안내">
      {[...errors, ...warnings].map((issue, index) => <li key={`${issue.type}-${index}`}>{issue.detail}</li>)}
      <li className={styles.hint}>{PACK_COPY.autoCheckNote}</li>
    </ul>}

    <div className={styles.subhead}>핵심 키워드 {answer.card.keywords.length}개</div>
    <ul className={styles.chips}>{answer.card.keywords.map((keyword) => <li key={keyword.text}><span className={styles.chip}>{keyword.text}</span></li>)}</ul>

    <div className={styles.subhead}>말하는 순서</div>
    <ol className={styles.orderList}>{answer.card.steps.map((step) => <li key={`${step.label}-${step.sentence}`}><b>{step.label}</b> — {step.sentence}</li>)}</ol>

    <div className={styles.subhead}>한 줄 기억 요약</div>
    <p className={styles.memory}>{answer.card.memoryLine}</p>

    <div className={styles.subhead}>예상 질문 <span className={styles.hint}>({PACK_COPY.followUpNote})</span></div>
    <ul className={styles.followList}>{answer.card.followUps.map((question) => <li key={question}>{question}</li>)}</ul>

    <details className={styles.detailsBox}>
      <summary>근거 보기 ({answer.card.evidence.length})</summary>
      {answer.card.evidence.length === 0
        ? <p className={styles.hint}>원문에서 확인된 근거가 없습니다. 이 답변은 사실과 맞는지 직접 확인해 주세요.</p>
        : <ul className={styles.evidence}>
          {answer.card.evidence.map((evidence) => <li key={`${evidence.docId}-${evidence.paragraph}-${evidence.quote}`}>
            <small>
              {evidence.docTitle} · {PACK_DOC_KIND_LABEL[evidence.docKind]} · 문서 {evidence.docId} 문단 {evidence.paragraph + 1} · 자료 v{evidence.materialsVersion}
              {evidence.documentVersionId ? ` · 원본 문서 ${evidence.documentId?.slice(0, 8)} / 버전 ${evidence.documentVersionId.slice(0, 8)}` : ""}
            </small>
            {highlight(evidence.paragraphText, evidence.quote)}
          </li>)}
        </ul>}
      <p className={styles.hint}>원문 링크가 있다는 것이 내용의 사실 여부를 보증하지는 않습니다. 원문과 맞는지 직접 확인해 주세요.</p>
    </details>

    <div className={styles.cardActions}>
      <button type="button" className={styles.btn} data-variant="quiet" data-size="sm" onClick={() => void handleCopy()}>{copied ? "복사됨" : "복사"}</button>
      <button type="button" className={styles.btn} data-variant="quiet" data-size="sm" onClick={() => { setDraft(answer.card.answer); setMode(mode === "edit" ? "view" : "edit"); }} disabled={busy}>직접 수정</button>
      <button type="button" className={styles.btn} data-variant="quiet" data-size="sm" onClick={() => setMode(mode === "menu" ? "view" : "menu")} disabled={busy}>AI로 수정</button>
      <button type="button" className={styles.btn} data-variant="quiet" data-size="sm" onClick={() => (mode === "history" ? setMode("view") : void openHistory())} disabled={busy}>이전 버전</button>
      <button type="button" className={styles.btn} data-size="sm" onClick={() => setMode(mode === "practice" ? "view" : "practice")}>{mode === "practice" ? "연습 닫기" : "연습하기"}</button>
    </div>

    {mode === "menu" && <div className={styles.menu}>
      <div className={styles.fieldLabel}>선택한 이 답변만 AI가 고칩니다</div>
      <p className={styles.hint}>남은 AI 수정 {editsRemaining}회. 다른 답변은 바뀌지 않고, 이전 버전은 복원할 수 있습니다. 읽기·직접 수정·연습에는 횟수가 필요 없습니다.</p>
      {reviseBlocked && <p className={styles.msg} data-kind="error">{reviseBlocked}</p>}
      <div className={styles.menuGrid}>
        {REVISE_CHOICES.filter((choice) => !choice.introOnly || isIntro).map((choice) => <button key={choice.kind} type="button" className={styles.btn} data-variant="ghost" data-size="sm" disabled={Boolean(reviseBlocked) || busy} onClick={() => setPending({ kind: choice.kind, label: choice.label })}>{choice.label}</button>)}
      </div>
      <label htmlFor={`custom-${answer.slot}`} className={styles.fieldLabel}>직접 요청 (한 줄)</label>
      <div className={styles.row}>
        <input id={`custom-${answer.slot}`} type="text" value={customText} maxLength={200} onChange={(event) => setCustomText(event.target.value)} placeholder="예: 조금 더 부드러운 말투로" />
        <button type="button" className={styles.btn} data-variant="ghost" data-size="sm" disabled={Boolean(reviseBlocked) || busy || customText.trim().length < 2} onClick={() => setPending({ kind: "custom", label: "직접 요청", custom: customText })}>요청</button>
      </div>
      {pending && <div className={styles.msg} data-kind="busy">
        ‘{pending.label}’로 고칩니다. 남은 AI 수정 {editsRemaining}회 중 1회를 사용합니다. 수정본이 제출한 자료와 맞지 않으면 반영하지 않고 횟수도 차감하지 않습니다.
        <div className={styles.actions}>
          <button type="button" className={styles.btn} data-size="sm" disabled={busy} onClick={() => void runRevise()}>{busy ? "고치는 중…" : "실행"}</button>
          <button type="button" className={styles.btn} data-variant="quiet" data-size="sm" disabled={busy} onClick={() => setPending(null)}>취소</button>
        </div>
      </div>}
    </div>}

    {mode === "history" && <div className={styles.menu}>
      <div className={styles.fieldLabel}>이전 버전</div>
      {historyBusy && <p className={styles.hint}>불러오는 중…</p>}
      {!historyBusy && history && history.length <= 1 && <p className={styles.hint}>아직 이전 버전이 없습니다.</p>}
      {!historyBusy && history && history.length > 1 && <ul className={styles.revisions}>
        {history.map((revision) => <li key={revision.id}>
          <span><b>버전 {revision.revisionNo}</b> · {CARD_ORIGIN_LABEL[revision.origin]} · {revision.card.answer.replace(/\s+/g, " ").slice(0, 60)}…</span>
          {revision.revisionNo === answer.revisionNo
            ? <em className={styles.hint}>현재</em>
            : <button type="button" className={styles.btn} data-variant="ghost" data-size="sm" disabled={busy} onClick={async () => { if (await onRestore(answer.slot, revision.revisionNo, answer.revisionNo)) setMode("view"); }}>이 버전으로 복원</button>}
        </li>)}
      </ul>}
    </div>}

    {mode === "practice" && <PracticePanel
      packId={packId}
      slot={answer.slot}
      slotLabel={slotDef.label}
      targetSeconds={slotDef.targetSeconds}
      targetLabel={slotDef.targetLabel}
      card={answer.card}
      onShorten={() => { setMode("menu"); setPending({ kind: "shorten", label: "조금 줄이기" }); }}
      shortenDisabledReason={reviseBlocked}
      onClose={() => setMode("view")}
    />}
  </article>;
}
