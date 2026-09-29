"use client";

import { useEffect, useRef, useState } from "react";
import {
  interviewFeedbackResultSchema,
  interviewFeedbackStatusSchema,
  interviewTranscriptionResultSchema,
  type InterviewFeedbackResult,
  type InterviewFeedbackStatus,
  type InterviewTranscriptionResult,
} from "@/domain/interview-feedback";
import { exportAudioForTranscription } from "@/lib/interview-media/audio-client";
import styles from "./interview-feedback-panel.module.css";
import { AnswerInsights } from "./training-insights";
import { DEFAULT_TRAINING_CONTEXT, QUESTION_TYPES, summarizeSpeech, type TrainingAttempt, type TrainingContext } from "@/domain/interview-training";

export type InterviewFeedbackPanelProps = {
  sourceBlob: Blob | null;
  sourceKey: string | null;
  durationSeconds: number;
  initialQuestion?: string;
  initialCompany?: string;
  initialRole?: string;
  initialAnswer?: string;
  trainingContext?: TrainingContext;
  onAttempt?: (attempt: TrainingAttempt) => void;
  onPractice?: (question: string) => void;
  disabledReason?: string;
  onSeek?: (seconds: number) => void;
};

type Job = "idle" | "transcribing" | "analyzing";
const starNames = { situation: "상황", task: "과제", action: "행동", result: "결과" } as const;
const starStatuses = { present: "확인됨", partial: "보완 필요", missing: "언급 없음", not_applicable: "해당 없음" } as const;
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;

function uniqueEvidenceSegment(evidence: string, transcription: InterviewTranscriptionResult | null) {
  const quote = evidence.trim();
  if (!quote || !transcription) return null;
  const matches = transcription.segments.filter((segment) => segment.text.includes(quote));
  if (matches.length !== 1) return null;
  const segment = matches[0];
  return segment.start < transcription.durationSeconds && segment.end > segment.start && segment.end <= transcription.durationSeconds ? segment : null;
}

async function responseBody(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "요청을 처리하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.";
    throw new Error(message);
  }
  return body;
}

/** A source switch unmounts the old state and cancels its requests. Raw answers are never persisted. */
export function InterviewFeedbackPanel(props: InterviewFeedbackPanelProps) {
  return <FeedbackPanel key={props.sourceKey ?? "manual-answer"} {...props} />;
}

function FeedbackPanel({ sourceBlob, durationSeconds, initialQuestion = "", initialCompany = "", initialRole = "", initialAnswer = "", trainingContext = DEFAULT_TRAINING_CONTEXT, onAttempt, onPractice, disabledReason, onSeek }: InterviewFeedbackPanelProps) {
  const [status, setStatus] = useState<InterviewFeedbackStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [question, setQuestion] = useState(initialQuestion);
  const [company, setCompany] = useState(initialCompany);
  const [role, setRole] = useState(initialRole);
  const [answer, setAnswer] = useState(initialAnswer);
  const [context, setContext] = useState(trainingContext);
  const [consent, setConsent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [source, setSource] = useState<"manual" | "transcription">("manual");
  const [transcription, setTranscription] = useState<InterviewTranscriptionResult | null>(null);
  const [result, setResult] = useState<InterviewFeedbackResult | null>(null);
  const [job, setJob] = useState<Job>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const active = useRef<AbortController | null>(null);
  const statusRequest = useRef<AbortController | null>(null);
  const resultHeading = useRef<HTMLHeadingElement | null>(null);

  const checkStatus = () => {
    statusRequest.current?.abort();
    const controller = new AbortController();
    statusRequest.current = controller;
    void fetch("/api/dev/interview-pro/status", { credentials: "same-origin", cache: "no-store", signal: controller.signal }).then(responseBody).then((body) => {
      const parsed = interviewFeedbackStatusSchema.safeParse(body);
      if (!parsed.success) throw new Error("AI 연결 상태 응답을 확인하지 못했습니다.");
      if (!controller.signal.aborted) { setStatus(parsed.data); setStatusError(""); }
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) { setStatus(null); setStatusError(err instanceof Error ? err.message : "연결 확인 실패"); }
    });
  };

  useEffect(() => {
    void checkStatus();
    return () => { active.current?.abort(); statusRequest.current?.abort(); };
  }, []);

  useEffect(() => {
    if (!result || !resultHeading.current) return;
    const reducedMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultHeading.current.focus({ preventScroll: true });
    resultHeading.current.scrollIntoView?.({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }, [result]);

  const invalidate = () => {
    active.current?.abort();
    setJob("idle"); setResult(null); setConfirmed(false); setError(""); setNotice("");
  };
  const cancel = () => {
    active.current?.abort(); setJob("idle");
    setNotice("화면의 요청을 중단했습니다. 이미 서버에 전달된 AI 요청은 처리·과금될 수 있습니다.");
  };
  const allowed = Boolean(status?.authorized && status.configured && status.enabled && !disabledReason);
  const busy = job !== "idle";
  const limit = status?.limits.maxAnswerCharacters ?? 12_000;
  const validDuration = Number.isFinite(durationSeconds) && durationSeconds > 0 && durationSeconds <= 180;
  const requestDuration = validDuration ? durationSeconds : null;
  const ready = allowed && consent && confirmed && question.trim().length >= 3 && answer.trim().length >= 20 && !busy;

  const transcribe = async () => {
    if (!sourceBlob || !allowed || !consent || busy || !validDuration) return;
    if (answer && !window.confirm("현재 입력한 답변을 새 받아쓰기 결과로 바꿀까요?")) return;
    const controller = new AbortController(); active.current?.abort(); active.current = controller;
    setJob("transcribing"); setError(""); setNotice(""); setResult(null); setConfirmed(false);
    try {
      const wav = await exportAudioForTranscription(sourceBlob, controller.signal, durationSeconds);
      if (controller.signal.aborted) return;
      if (wav.size > (status?.limits.maxAudioBytes ?? 12 * 1024 * 1024)) throw new Error("음성이 12MB를 초과합니다. 3분 이내 답변을 선택해 주세요.");
      const form = new FormData();
      form.set("file", wav, "interview-answer.wav"); form.set("consent", "true"); form.set("requestId", crypto.randomUUID());
      const response = await fetch("/api/dev/interview-pro/transcribe", { method: "POST", credentials: "same-origin", body: form, signal: controller.signal });
      const parsed = interviewTranscriptionResultSchema.safeParse(await responseBody(response));
      if (!parsed.success) throw new Error("받아쓰기 결과 형식을 확인하지 못했습니다. 자동 분석은 진행하지 않습니다.");
      if (!parsed.data.text.trim()) throw new Error("인식된 답변이 없습니다. 원음을 확인하거나 답변을 직접 입력해 주세요.");
      if (!controller.signal.aborted) {
        setTranscription(parsed.data); setAnswer(parsed.data.text); setSource("transcription");
        setNotice("받아쓴 내용에서 이름·수치·전문용어를 확인해 주세요. 확인 전에는 피드백을 요청하지 않습니다.");
      }
    } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "받아쓰기 실패"); }
    finally { if (active.current === controller && !controller.signal.aborted) setJob("idle"); }
  };

  const analyze = async () => {
    if (!ready) return;
    const controller = new AbortController(); active.current?.abort(); active.current = controller;
    setJob("analyzing"); setError(""); setNotice(""); setResult(null);
    try {
      const response = await fetch("/api/dev/interview-pro/feedback", {
        method: "POST", credentials: "same-origin", signal: controller.signal, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: crypto.randomUUID(), consent: true, transcriptConfirmed: true, question: question.trim(), company: company.trim(), role: role.trim(), answerText: answer.trim(), durationSeconds: requestDuration, transcriptSource: source, trainingContext: context }),
      });
      const parsed = interviewFeedbackResultSchema.safeParse(await responseBody(response));
      if (!parsed.success) throw new Error("AI 결과 형식을 확인하지 못했습니다. 확인되지 않은 점수나 예시 결과는 표시하지 않습니다.");
      if (!controller.signal.aborted) {
        setResult(parsed.data);
        onAttempt?.({ id: parsed.data.metadata.requestId, question: question.trim(), company: company.trim(), role: role.trim(), answer: answer.trim(), duration: requestDuration, result: parsed.data, speech: summarizeSpeech(answer.trim(), transcription, sourceBlob ? requestDuration : null), createdAt: Date.now() });
      }
    } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "답변 분석 실패"); }
    finally { if (active.current === controller && !controller.signal.aborted) setJob("idle"); }
  };

  const renderEvidence = (evidence: string) => {
    const segment = uniqueEvidenceSegment(evidence, transcription);
    return <><blockquote>{evidence}</blockquote>{segment && onSeek && <button type="button" className={styles.evidenceLink} title="받아쓰기 모델이 추정한 해당 구간 시작으로 이동합니다." onClick={() => onSeek(segment.start)}>원음에서 확인 {time(segment.start)}</button>}</>;
  };

  return <section className={styles.panel} aria-labelledby="interview-feedback-title">
    <header className={styles.heading}>
      <div><h2 id="interview-feedback-title">답변 피드백</h2><p>무엇이 아쉬웠는지, 다음에는 어떻게 말하면 좋을지 확인하세요.</p></div>
      <span className={styles.localLabel}>개발자 테스트</span>
    </header>

    <div className={styles.context}>
      <label className={styles.question}>면접 질문<textarea value={question} maxLength={2000} rows={2} placeholder="어떤 질문에 답했나요?" onChange={(event) => { invalidate(); setQuestion(event.target.value); }} /></label>
      <label><span className={styles.fieldName}>지원 기업 <span>선택</span></span><input value={company} maxLength={200} placeholder="기업명" onChange={(event) => { invalidate(); setCompany(event.target.value); }} /></label>
      <label><span className={styles.fieldName}>지원 직무 <span>선택</span></span><input value={role} maxLength={200} placeholder="직무명" onChange={(event) => { invalidate(); setRole(event.target.value); }} /></label>
    </div>

    <div className={styles.answerHeader}><label htmlFor="interview-answer-text">내 답변</label><button type="button" className={styles.secondary} disabled={!sourceBlob || !allowed || !consent || busy || !validDuration} onClick={() => { void transcribe(); }}>{job === "transcribing" ? "받아쓰는 중…" : "답변 받아쓰기"}</button></div>
    <textarea id="interview-answer-text" className={styles.answer} value={answer} maxLength={limit} rows={7} placeholder="답변을 직접 입력하거나, 녹화를 선택한 뒤 음성을 받아쓰세요. 마이크 없이도 텍스트로 분석할 수 있어요." onChange={(event) => { invalidate(); setAnswer(event.target.value); setSource("manual"); setTranscription(null); }} />
    <div className={styles.answerHint}><span>받아쓰기는 음성만 전송해요. 직접 입력하면 텍스트만 사용해요.</span><span>{answer.length.toLocaleString()} / {limit.toLocaleString()}</span></div>
    {sourceBlob && !validDuration && <p className={styles.notice}>{durationSeconds > 180 ? "받아쓰기는 3분 이내 파일만 지원합니다. 답변을 직접 입력해 내용 피드백을 받을 수 있어요." : "파일 길이를 확인 중입니다. 확인되지 않으면 MP4·WAV 형식으로 다시 선택하거나 답변을 직접 입력해 주세요."}</p>}

    {transcription && <details className={styles.detail}><summary>받아쓰기 구간 확인{transcription.segments.length ? ` · ${transcription.segments.length}개` : ""}</summary><p>구간 시각은 받아쓰기 모델의 추정값입니다. 원음을 듣고 내용이 맞는지 확인하세요.</p>{transcription.segments.length ? <ol className={styles.segments}>{transcription.segments.map((segment, index) => <li key={`${segment.start}-${index}`}><button type="button" disabled={!onSeek} onClick={() => onSeek?.(segment.start)}>{time(segment.start)}</button><span>{segment.text}</span></li>)}</ol> : <p>이 받아쓰기 모델은 구간별 시각을 제공하지 않았습니다.</p>}</details>}

    <details className={styles.detail}><summary>질문 유형·지원자료 설정</summary><label>평가할 질문 유형<select value={context.questionType} onChange={(event) => { invalidate(); setContext({ ...context, questionType: event.target.value as TrainingContext["questionType"] }); }}><option value="auto">질문에서 자동 분류</option>{Object.entries(QUESTION_TYPES).map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select></label><label>내 자소서·경험 자료 (선택, 최대 6,000자)<textarea value={context.supportText} maxLength={6000} rows={4} onChange={(event) => { invalidate(); setContext({ ...context, supportText: event.target.value }); }} /></label><p>직접 확인한 자료만 넣어 주세요. 분석 실행 시 질문·답변과 함께 OpenAI로 전송됩니다. 여기서 편집한 자료는 이 답변 분석에만 적용돼요.</p></details>
    <div className={styles.permission}>
      <label><input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); if (!event.target.checked && busy) cancel(); }} /><span>선택한 음성(받아쓰기 시) 또는 질문·답변 텍스트를 OpenAI에 전송하는 데 동의합니다. <strong>버튼 실행마다 API 비용이 발생할 수 있어요.</strong></span></label>
      <label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={!answer.trim() || !question.trim() || busy} /><span>질문과 답변 내용을 확인했어요. 잘못 받아쓴 내용은 수정했어요.</span></label>
    </div>

    {!allowed && <div className={styles.connection} role="status"><span>{disabledReason || statusError || status?.reason || (status ? "AI 분석 설정을 확인해 주세요. 관리자 계정과 로컬 서버 설정이 필요합니다." : "AI 연결 상태를 확인하고 있어요…")}</span>{!disabledReason && <button type="button" className={styles.textButton} onClick={() => { void checkStatus(); }}>연결 다시 확인</button>}</div>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <div className={styles.actions}>
      <button type="button" className={styles.primary} disabled={!ready} onClick={() => { void analyze(); }}>{job === "analyzing" ? "답변을 분석하고 있어요…" : result ? "다시 분석하기" : "AI 답변 분석"}</button>
      {busy ? <button type="button" className={styles.secondary} onClick={cancel}>요청 중단</button> : <p>{answer.trim().length > 0 && answer.trim().length < 20 ? "구체적인 피드백을 위해 답변을 20자 이상 입력해 주세요." : "답변 내용 중심의 연습용 피드백입니다. 발음·시선 평가나 합격 예측은 포함하지 않습니다."}</p>}
    </div>

    {result && <div className={styles.result} aria-live="polite">
      <div className={styles.summary}><h3 ref={resultHeading} tabIndex={-1}>이번 답변의 핵심</h3><p>{result.feedback.summary}</p></div>
      <section className={styles.priorities}><h3>다음 답변에서 바꿀 점</h3>{result.feedback.priorities.length === 0 && <p className={styles.emptyPriorities}>현재 답변에서 근거를 갖춰 지적할 개선점은 찾지 못했습니다.</p>}{result.feedback.priorities.slice(0, 3).map((item, index) => <article className={styles.priority} key={`${item.title}-${index}`}><div className={styles.priorityTitle}><span>{index + 1}</span><h4>{item.title}</h4></div>{renderEvidence(item.evidence)}<p>{item.reason}</p><div className={styles.suggestion}><h5>이렇게 다듬어 보세요</h5><p>{item.improvedAnswer}</p><h5>다음 연습</h5><p>{item.practice}</p></div></article>)}</section>
      {result.feedback.strengths.length > 0 && <section className={styles.strengths}><h3>유지하면 좋은 점</h3>{result.feedback.strengths.map((item, index) => <article key={`${item.title}-${index}`}><h4>{item.title}</h4><p>{item.reason}</p>{renderEvidence(item.evidence)}</article>)}</section>}
      <AnswerInsights answer={answer.trim()} result={result} transcription={transcription} duration={sourceBlob ? requestDuration : null} onSeek={onSeek} onPractice={onPractice} />
      {onPractice && <button type="button" className={styles.secondary} onClick={() => onPractice(question)}>이 질문 다시 연습하기</button>}
      <details className={styles.detail}><summary>답변 구조와 개선 예시 자세히 보기</summary><div className={styles.star}>{(Object.keys(starNames) as (keyof typeof starNames)[]).map((key) => { const item = result.feedback.star[key]; return <article key={key}><div><h4>{starNames[key]}</h4><span>{starStatuses[item.status]}</span></div><p>{item.comment}</p>{item.evidence && <blockquote>{item.evidence}</blockquote>}</article>; })}</div><h4>내 경험을 유지한 개선 예시</h4><p className={styles.rewrite}>{result.feedback.betterAnswer}</p><p>사실과 다른 부분이나 확인이 필요한 내용은 본인의 경험에 맞게 수정하세요.</p>{result.feedback.verificationQuestions.length > 0 && <><h4>추가로 확인할 내용</h4><ul>{result.feedback.verificationQuestions.map((item, index) => <li key={index}>{item}</li>)}</ul></>}{result.feedback.likelyFollowups.length > 0 && <><h4>이어질 수 있는 꼬리질문</h4><ul>{result.feedback.likelyFollowups.map((item, index) => <li key={index}>{item}</li>)}</ul></>}</details>
      <details className={styles.detail}><summary>이번 분석의 범위와 한계</summary><p>확인한 질문·답변 텍스트를 바탕으로 분석했습니다. 받아쓰기 성공이 발음 정확도를 의미하지는 않습니다. 얼굴·목소리로 성격, 감정, 신뢰도, 채용 가능성을 판단하지 않습니다.</p>{result.feedback.unassessed.length > 0 && <ul>{result.feedback.unassessed.map((item, index) => <li key={index}>{item}</li>)}</ul>}<dl className={styles.metadata}><div><dt>모델</dt><dd>{result.metadata.model}</dd></div><div><dt>프롬프트 / 평가 기준</dt><dd>{result.metadata.promptVersion} / {result.metadata.rubricVersion}</dd></div></dl></details>
    </div>}
  </section>;
}
