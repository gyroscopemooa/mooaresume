"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PACK_SLOTS, type PackSlotId, type PackSupplements } from "@/domain/interview-pack";
import type { SupplementInput } from "@/domain/interview-pack-materials";
import type { ActionResult, PackState } from "@/server/interview-pack/service";
import { PackApiError, type AvailabilityView, type PackClientApi } from "@/lib/interview-pack/client-api";
import { AnswerCard } from "./answer-card";
import { PACK_COPY } from "./copy";
import { EMPTY_DRAFTS, MaterialsSection, type SupplementDrafts } from "./materials-section";
import { ReadinessSection, type ConfirmDraft } from "./readiness-section";
import styles from "./interview-pack.module.css";

/**
 * FINAL 면접 준비팩 화면.
 *
 * 흐름: [만들기] → [자료 확인] → [부족한 내용 보완] → [점검] → [답변 만들기] → [확인·키워드 연습]
 *
 * 이 화면은 서버와의 통신을 `api` 로만 한다. 실제 화면은 라우트를 부르고, 샘플 화면은 브라우저 안의 고정 응답을 쓴다.
 * 화면에 들어오거나 새로고침하거나 탭을 옮기는 것만으로는 AI 를 부르지 않는다 — AI 는 아래 버튼 세 개
 * (자료 점검 / 답변 만들기·이어서 만들기 / AI로 수정)를 눌렀을 때만 돈다.
 */

type Props = {
  api: PackClientApi;
  mode: "live" | "sample";
  /** 관리자 테스트 경로 표시. 없으면 팩의 출처로 판단한다. */
  testKind?: "snapshot" | "full-flow" | null;
};

type View = "loading" | "hidden" | "error" | "unavailable" | "intro" | "ready";
type Message = { kind: "error" | "notice" | "busy"; text: string };

const BUSY_TEXT: Record<string, string> = {
  open: "이 지원 건의 자료를 불러오는 중입니다…",
  save: "보완한 내용을 새 버전으로 저장하는 중입니다…",
  check: "AI가 자료를 점검하는 중입니다. 1~2분쯤 걸릴 수 있어요. 새로고침해도 이중으로 차감되지 않습니다.",
  generate: "답변을 만드는 중입니다. 1~2분쯤 걸릴 수 있어요. 새로고침해도 이중으로 차감되지 않습니다.",
  edit: "수정본을 저장하는 중입니다…",
  revise: "선택한 답변만 AI가 고치는 중입니다…",
  restore: "이전 버전을 복원하는 중입니다…",
};

function newKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const CORE_IDS = PACK_SLOTS.filter((slot) => slot.group === "core").map((slot) => slot.id);
const EXTRA_IDS = PACK_SLOTS.filter((slot) => slot.group === "extra").map((slot) => slot.id);

export function InterviewPackPanel({ api, mode, testKind = null }: Props) {
  const [view, setView] = useState<View>("loading");
  const [availability, setAvailability] = useState<AvailabilityView | null>(null);
  const [state, setState] = useState<PackState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [showExtra, setShowExtra] = useState(false);
  const [drafts, setDrafts] = useState<SupplementDrafts>(EMPTY_DRAFTS);
  const [slotAnswerDrafts, setSlotAnswerDrafts] = useState<Record<string, string>>({});
  const [confirmDrafts, setConfirmDrafts] = useState<Record<string, ConfirmDraft>>({});
  // 같은 클릭의 재전송(새로고침·끊긴 연결)은 같은 요청 키를 쓴다 — 서버가 한 번만 처리한다.
  const keys = useRef<Record<string, string>>({});
  const keyFor = (name: string) => (keys.current[name] ??= newKey());

  // 처음 들어왔을 때: 저장된 것을 읽기만 한다(AI 호출 없음).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await api.load();
        if (cancelled) return;
        setAvailability(loaded.availability);
        if (!loaded.availability.available) {
          setView(loaded.availability.reason === "not_offered" ? "hidden" : "unavailable");
          return;
        }
        if (loaded.state) {
          setState(loaded.state);
          setView("ready");
        } else {
          setView("intro");
        }
      } catch (error) {
        if (cancelled) return;
        setMessage({ kind: "error", text: error instanceof PackApiError ? error.message : "면접 준비팩을 불러오지 못했습니다." });
        setView("error");
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  // 다른 탭·이전 새로고침에서 시작된 작업이 진행 중이면 결과가 저장될 때까지 가끔 확인한다.
  const serverBusy = Boolean(state?.pack.busy);
  useEffect(() => {
    if (!serverBusy || busy) return undefined;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (tries > 75) {
        window.clearInterval(timer);
        return;
      }
      api.load().then((loaded) => { if (loaded.state) setState(loaded.state); }).catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [serverBusy, busy, api]);

  async function perform(name: string, keyName: string | null, work: () => Promise<ActionResult>): Promise<boolean> {
    if (busy) return false;
    setBusy(name);
    setMessage({ kind: "busy", text: BUSY_TEXT[name] ?? "처리 중입니다…" });
    try {
      const result = await work();
      setState(result.state);
      setMessage(result.notice ? { kind: "notice", text: result.notice } : null);
      if (keyName) delete keys.current[keyName];
      return true;
    } catch (error) {
      if (error instanceof PackApiError) {
        // 서버 응답이 있었다면 그 요청 키는 끝난 것이다. 연결이 끊긴 경우에만 같은 키로 다시 보낸다.
        if (!error.network && keyName) delete keys.current[keyName];
        setMessage({ kind: "error", text: error.message });
        if (error.code === "IN_PROGRESS" || error.code === "BUSY") void api.load().then((loaded) => { if (loaded.state) setState(loaded.state); }).catch(() => undefined);
      } else {
        setMessage({ kind: "error", text: "처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
      }
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function openPack() {
    if (busy) return;
    setBusy("open");
    setMessage({ kind: "busy", text: BUSY_TEXT.open });
    try {
      setState(await api.open());
      setView("ready");
      setMessage(null);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof PackApiError ? error.message : "팩을 만들지 못했습니다." });
    } finally {
      setBusy(null);
    }
  }

  const supplementPayload = useMemo<SupplementInput | null>(() => {
    if (!state) return null;
    const supplements: PackSupplements = {};
    const current = (key: keyof PackSupplements): string => (key === "company" ? state.materials.company : key === "role" ? state.materials.role : (state.materials.supplements[key] ?? "").toString());
    for (const key of Object.keys(drafts) as Array<keyof PackSupplements>) {
      const value = drafts[key].trim();
      if (value && value !== current(key).trim()) supplements[key] = value;
    }
    const slotAnswers = Object.entries(slotAnswerDrafts)
      .map(([id, answer]) => {
        const [slot, question] = id.split("::");
        return { slot: slot as PackSlotId, question, answer: answer.trim() };
      })
      .filter((entry) => entry.answer.length > 0 && entry.question);
    const confirmations = Object.entries(confirmDrafts)
      .filter(([, draft]) => draft.choice !== "" && (draft.choice !== "custom" || draft.customText.trim().length > 0))
      .map(([conflictId, draft]) => ({ conflictId, choice: draft.choice as "left" | "right" | "custom", ...(draft.choice === "custom" ? { customText: draft.customText.trim() } : {}) }));
    if (Object.keys(supplements).length === 0 && slotAnswers.length === 0 && confirmations.length === 0) return null;
    return { supplements, slotAnswers, confirmations };
  }, [state, drafts, slotAnswerDrafts, confirmDrafts]);

  async function saveSupplements() {
    if (!supplementPayload) return;
    const ok = await perform("save", null, () => api.saveMaterials(supplementPayload));
    if (ok) {
      setDrafts(EMPTY_DRAFTS);
      setSlotAnswerDrafts({});
      setConfirmDrafts({});
    }
  }

  async function fetchPosting(url: string): Promise<{ ok: true; text: string } | { ok: false }> {
    const response = await fetch("/api/job-postings/fetch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
    const payload: unknown = await response.json().catch(() => null);
    if (payload && typeof payload === "object" && (payload as { ok?: unknown }).ok === true && typeof (payload as { text?: unknown }).text === "string") {
      return { ok: true, text: (payload as { text: string }).text };
    }
    return { ok: false };
  }

  async function readFile(file: File): Promise<string> {
    const { extractLocalDocument } = await import("@/lib/local-document");
    const document = await extractLocalDocument(file);
    if (document.unreadable || !document.text.trim()) throw new Error("이 파일에서는 글을 읽지 못했어요. 본문을 복사해서 붙여 넣어 주세요.");
    return document.text;
  }

  // ─────────── 렌더 ───────────

  const heading = <div className={styles.head}>
    <div>
      <h2>{PACK_COPY.title}</h2>
      <p className={styles.lead}>{PACK_COPY.lead}</p>
    </div>
    <span className={styles.tag}>FINAL</span>
  </div>;

  const resolvedTestKind = testKind ?? (state?.pack.isTest ? (state.pack.origin === "admin_snapshot" ? "snapshot" : "full-flow") : null);
  const banner = mode === "sample"
    ? <div className={styles.mode} data-kind="sample" role="note">샘플 화면 · 실제 AI 생성 아님<small>고정 가상 자료와 미리 써 둔 예시 응답으로 화면만 점검합니다. 결제·AI·외부 유료 API를 부르지 않습니다.</small></div>
    : resolvedTestKind === "snapshot"
      ? <div className={styles.mode} data-kind="cost" role="note">실제 AI 사용 요금 발생 · 결제 및 원본 파일 파싱은 이 경로에서 검증하지 않음<small>가상 자료 또는 내 FINAL 결과 사본으로 실제 면접팩 생성·저장·권한 확인·수정 로직을 실행합니다.</small></div>
      : resolvedTestKind === "full-flow"
        ? <div className={styles.mode} data-kind="cost" role="note">실제 AI 사용 요금 발생 · 결제대행사 연동은 별도 검증<small>관리자 테스트 이용권으로 진행한 FINAL 결과입니다. 실제 사용자와 같은 경로로 면접 준비팩을 만듭니다.</small></div>
        : null;

  if (view === "hidden") return null;

  if (view === "loading") return <section className={styles.panel} aria-busy="true">{heading}<p className={styles.empty}>불러오는 중입니다…</p></section>;

  if (view === "error") return <section className={styles.panel}>{heading}<p className={styles.msg} data-kind="error" role="alert">{message?.text ?? "면접 준비팩을 불러오지 못했습니다."}</p></section>;

  if (view === "unavailable") return <section className={styles.panel}>{heading}<p className={styles.msg} data-kind="notice" role="status">{availability?.reason ?? "지금은 이 결과에서 면접 준비팩을 사용할 수 없습니다."}</p></section>;

  if (view === "intro" || !state) {
    return <section className={styles.panel}>
      {heading}
      {banner}
      <p className={styles.hint} style={{ marginTop: 14 }}>{PACK_COPY.openHint}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={() => void openPack()} disabled={busy !== null}>{busy === "open" ? "불러오는 중…" : PACK_COPY.title + " 만들기"}</button>
      </div>
      {message && <p className={styles.msg} data-kind={message.kind} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
    </section>;
  }

  const assessment = state.assessment;
  const freshAssessment = assessment && !assessment.stale;
  const answerBySlot = new Map(state.answers.map((answer) => [answer.slot, answer]));
  const readySlots = freshAssessment ? assessment.slots.filter((slot) => slot.status === "ready").map((slot) => slot.slot) : [];
  const pendingReady = readySlots.filter((slot) => !answerBySlot.has(slot));
  const deferredCount = assessment ? assessment.slots.filter((slot) => slot.status !== "ready").length : 0;
  const editsRemaining = state.usage.edit.remaining;
  const initialDone = state.pack.initialGenerated;
  const isBusy = busy !== null || Boolean(state.pack.busy);

  const stepState = (index: number): "done" | "active" | "todo" => {
    const done = [true, Boolean(assessment), Boolean(freshAssessment), initialDone, state.answers.length > 0][index];
    if (done) return "done";
    const firstOpen = [true, Boolean(assessment), Boolean(freshAssessment), initialDone, state.answers.length > 0].findIndex((value) => !value);
    return firstOpen === index ? "active" : "todo";
  };
  const STEP_LABELS = ["자료 확인", "부족한 내용 보완", "점검", "만들기", "확인·연습"];

  return <section className={styles.panel} aria-label={PACK_COPY.title}>
    {heading}
    {banner}
    {state.testBudget && <p className={styles.hint} style={{ marginTop: 8 }}>오늘 실제 AI 테스트 남은 호출 {state.testBudget.remaining}/{state.testBudget.dailyLimit}회 · 호출별 출력 토큰 상한: 점검 {state.testBudget.tokenLimits.assess.toLocaleString("ko-KR")} · 생성 {state.testBudget.tokenLimits.generate.toLocaleString("ko-KR")} · 수정 {state.testBudget.tokenLimits.revise.toLocaleString("ko-KR")}</p>}

    <ol className={styles.steps} aria-label="진행 단계">
      {STEP_LABELS.map((label, index) => <li key={label} data-state={stepState(index)}><b>{index + 1}</b>{label}</li>)}
    </ol>

    <MaterialsSection
      state={state}
      drafts={drafts}
      onDraft={(key, value) => setDrafts((previous) => ({ ...previous, [key]: value }))}
      externalInputs={mode === "live"}
      onFetchPosting={mode === "live" ? fetchPosting : undefined}
      onReadFile={mode === "live" ? readFile : undefined}
      disabled={isBusy}
    />

    <ReadinessSection
      state={state}
      slotAnswerDrafts={slotAnswerDrafts}
      onSlotAnswer={(slot, question, value) => setSlotAnswerDrafts((previous) => ({ ...previous, [`${slot}::${question}`]: value }))}
      confirmDrafts={confirmDrafts}
      onConfirmDraft={(conflictId, draft) => setConfirmDrafts((previous) => ({ ...previous, [conflictId]: draft }))}
      disabled={isBusy}
    />

    <div className={styles.actions}>
      <button type="button" className={styles.btn} data-variant="ghost" onClick={() => void saveSupplements()} disabled={isBusy || !supplementPayload}>보완 내용 저장</button>
      <button type="button" className={styles.btn} onClick={() => void perform("check", "check", () => api.check(keyFor("check")))} disabled={isBusy || !state.aiAvailable || state.usage.check.remaining <= 0}>
        {busy === "check" ? "점검 중…" : assessment ? (assessment.stale ? "다시 점검하기" : "다시 점검") : "자료 점검하기"}
      </button>
      {!initialDone && <button type="button" className={styles.btn} onClick={() => void perform("generate", "generate:initial", () => api.generate(keyFor("generate:initial"), "initial"))} disabled={isBusy || !state.aiAvailable || readySlots.length === 0 || state.usage.initial.remaining <= 0}>
        {busy === "generate" ? "만드는 중…" : `답변 만들기 (${readySlots.length}개 문항)`}
      </button>}
      {initialDone && pendingReady.length > 0 && <button type="button" className={styles.btn} onClick={() => void perform("generate", "generate:complete", () => api.generate(keyFor("generate:complete"), "complete"))} disabled={isBusy || !state.aiAvailable}>
        {busy === "generate" ? "만드는 중…" : `보류했던 ${pendingReady.length}개 문항 이어서 만들기`}
      </button>}
    </div>
    <p className={styles.usage} style={{ marginTop: 8 }}>
      {!initialDone && readySlots.length > 0 && `‘답변 만들기’는 팩 최초 생성 ${state.usage.initial.limit}회 중 1회를 사용하고, 자료가 충분한 ${readySlots.length}개 문항만 만듭니다. `}
      {!initialDone && !freshAssessment && "먼저 자료를 점검해 주세요. "}
      {initialDone && pendingReady.length > 0 && "이어서 만들기는 최초 생성 범위라 사용자 횟수가 줄지 않습니다. "}
      점검 {state.usage.check.used}/{state.usage.check.limit} · 최초 생성 {state.usage.initial.used}/{state.usage.initial.limit} · AI 수정 {state.usage.edit.used}/{state.usage.edit.limit} — 읽기·직접 수정·연습에는 횟수가 필요 없고, 기존 자소서 첨삭 횟수도 쓰지 않습니다.
    </p>
    {assessment && assessment.unresolvedConflictCount > 0 && <p className={styles.msg} data-kind="notice" role="status">서류 사이 다른 내용이 {assessment.unresolvedConflictCount}건 남아 있어요. 확인하시기 전에는 그 내용이 들어가는 문항을 만들지 않습니다.</p>}
    {!state.aiAvailable && <p className={styles.msg} data-kind="error" role="alert">지금은 AI 기능을 사용할 수 없어요. 저장된 답변 보기·직접 수정·연습은 계속 쓸 수 있습니다.</p>}
    {message && <p className={styles.msg} data-kind={message.kind} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
    {state.pack.busy && !busy && <p className={styles.msg} data-kind="busy" role="status">AI 작업이 진행 중입니다. 끝나면 이 화면에 자동으로 표시됩니다.</p>}

    <section className={styles.section} aria-labelledby="pack-answers">
      <h3 id="pack-answers">③ 답변 확인·키워드 연습</h3>
      <p className={styles.hint}>{PACK_COPY.autoCheckNote}</p>
      {state.answers.length === 0 && <p className={styles.empty}>아직 만든 답변이 없어요. 자료를 점검하고 ‘답변 만들기’를 누르면 자료가 충분한 문항부터 만들어집니다.{deferredCount > 0 && assessment ? ` (지금 보완이 필요한 문항 ${deferredCount}개)` : ""}</p>}

      <div className={styles.answers}>
        {CORE_IDS.map((slot) => renderSlot(slot))}
      </div>
      {(EXTRA_IDS.some((slot) => answerBySlot.has(slot)) || assessment) && <div className={styles.more}>
        <button type="button" className={styles.btn} data-variant="quiet" aria-expanded={showExtra} onClick={() => setShowExtra((value) => !value)}>{showExtra ? "추가 문항 접기" : `추가 문항 펼치기 (${EXTRA_IDS.length}개)`}</button>
      </div>}
      {showExtra && <div className={styles.answers} style={{ marginTop: 14 }}>{EXTRA_IDS.map((slot) => renderSlot(slot))}</div>}
    </section>

    <p className={styles.footnote}>기존 모의면접 탭은 그대로 있고, 이 면접 준비팩은 그와 별개로 텍스트 답변을 만들어 외우는 도구입니다. 카메라·마이크·녹음은 사용하지 않습니다.</p>
  </section>;

  function renderSlot(slot: PackSlotId) {
    const answer = answerBySlot.get(slot);
    const def = PACK_SLOTS.find((entry) => entry.id === slot)!;
    if (answer) {
      return <AnswerCard
        key={slot}
        packId={state!.pack.id}
        answer={answer}
        editsRemaining={editsRemaining}
        aiAvailable={state!.aiAvailable}
        busy={isBusy}
        onSaveEdit={(target, baseRevision, text) => perform("edit", null, () => api.edit({ slot: target, baseRevision, answer: text }))}
        onRevise={(target, kind, customText) => perform("revise", `revise:${target}:${kind}:${customText ?? ""}`, () => api.revise({ slot: target, kind, customText, requestKey: keyFor(`revise:${target}:${kind}:${customText ?? ""}`) }))}
        onLoadRevisions={(target) => api.revisions(target)}
        onRestore={(target, revisionNo, baseRevision) => perform("restore", null, () => api.restore({ slot: target, revisionNo, baseRevision }))}
      />;
    }
    const status = assessment?.slots.find((entry) => entry.slot === slot);
    if (!status) return null;
    return <article className={styles.card} key={slot} data-incomplete="true" aria-label={def.label}>
      <div className={styles.cardHead}>
        <h4>{def.label}</h4>
        <span className={styles.target}>{def.targetLabel}</span>
      </div>
      <div className={styles.badges}><span className={styles.badge} data-tone="muted">아직 만들지 않음</span></div>
      <p className={styles.reason}>{status.status === "ready" ? "만들 수 있는 항목입니다. ‘답변 만들기’에서 함께 만들어집니다." : `완성 답변으로 표시하지 않습니다. ${status.reason}`}</p>
    </article>;
  }
}
