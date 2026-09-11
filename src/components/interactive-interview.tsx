"use client";

import { useEffect, useState } from "react";
import type { ResultDocument } from "@/domain/result-document";
import type { InterviewEvaluation, InterviewReport } from "@/domain/interview";
import { isGooglePlayBillingAvailable, purchaseInterviewRetryViaGooglePlay } from "@/lib/google-play/purchase";
import styles from "./interactive-interview.module.css";

/**
 * FINAL 전용 인터랙티브 모의면접.
 *
 * 가격표가 약속했던 "인터랙티브 AI 모의면접 · 답변 평가 · 동적 꼬리질문 ·
 * 최종 리포트"의 실제 구현입니다. 첫 질문은 AI 호출 없이 이미 결제된 분석의
 * interviewQuestions에서 옵니다 — 답변을 제출해야 처음으로 AI를 부릅니다.
 *
 * 숫자 점수·합격확률은 어디에도 없습니다. 평가는 항상 강점/부족한 점 목록과
 * 짧은 근거 문장으로만 옵니다.
 *
 * 진행 상태는 서버(interview_sessions.pending_question)에 저장되므로 다른
 * 페이지에 갔다 와서 "시작하기"를 다시 눌러도 처음 질문으로 되돌아가지
 * 않는다 — /api/interview/start가 이미 답한 턴 기록과 다음 질문을 같이
 * 돌려준다.
 *
 * "처음부터 다시"와 "약점만 다시"는 각각 1회 무료다. 두 번째부터는
 * /api/interview/start가 PAYMENT_REQUIRED를 돌려주고, 3,000원 결제 후에만
 * 다시 열린다(Polar 웹 결제 또는 Play 인앱결제 — 기존 결제 버튼과 같은
 * getDigitalGoodsService 분기).
 */

type Turn = { question: string; answer: string; evaluation: InterviewEvaluation };
type Phase = "idle" | "active" | "busy" | "report" | "payment";

type SessionState = { sessionId: string; maxTurns: number };

const RETRY_FOCUS_STORAGE_KEY = "mooa:interview-retry-focus";

export function InteractiveInterview({ result, analysisRunId }: { result: ResultDocument; analysisRunId: string | null }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [session, setSession] = useState<SessionState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);
  const [finalReport, setFinalReport] = useState<InterviewReport | null>(null);
  const [message, setMessage] = useState("");
  const [pendingFocusQuestionIds, setPendingFocusQuestionIds] = useState<string[] | undefined>(undefined);

  // Polar 결제 후 돌아온 자리. 저장해 둔 재시도 종류(전체/약점만)를 읽어
  // 결제를 서버에서 확인하고, 성공하면 그 종류로 바로 세션을 시작한다.
  useEffect(() => {
    if (!analysisRunId) return;
    const url = new URL(window.location.href);
    const checkoutId = url.searchParams.get("interviewRetryCheckout");
    if (!checkoutId) return;

    const storedFocus = sessionStorage.getItem(RETRY_FOCUS_STORAGE_KEY);
    const focusQuestionIds = storedFocus ? (JSON.parse(storedFocus) as string[]) : undefined;
    sessionStorage.removeItem(RETRY_FOCUS_STORAGE_KEY);
    url.searchParams.delete("interviewRetryCheckout");
    window.history.replaceState({}, "", url.toString());

    queueMicrotask(() => {
      setPhase("busy");
      setMessage("결제를 확인하는 중입니다...");
    });
    void (async () => {
      try {
        const response = await fetch("/api/interview/retry/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ analysisRunId, checkoutId }),
        });
        const body = await response.json().catch(() => ({})) as { paid?: boolean; error?: string };
        if (!response.ok || !body.paid) {
          setMessage(body.error ?? "결제 확인이 아직 끝나지 않았습니다. 잠시 후 다시 시도해 주세요.");
          setPhase("idle");
          return;
        }
        await start(focusQuestionIds);
      } catch {
        setMessage("결제 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        setPhase("idle");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisRunId]);

  if (!analysisRunId || result.interviewQuestions.length === 0) return null;

  async function start(focusQuestionIds?: string[]) {
    setPhase("busy");
    setMessage("");
    try {
      const response = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ analysisRunId, ...(focusQuestionIds ? { focusQuestionIds } : {}) }),
      });
      const body = await response.json().catch(() => ({})) as {
        sessionId?: string;
        maxTurns?: number;
        seedQuestions?: Array<{ question: string }>;
        pendingQuestion?: string | null;
        history?: Turn[];
        error?: string;
        code?: string;
      };
      if (!response.ok || !body.sessionId || !body.seedQuestions?.length) {
        if (body.code === "PAYMENT_REQUIRED") {
          setPendingFocusQuestionIds(focusQuestionIds);
          setPhase("payment");
          return;
        }
        setMessage(body.error ?? "모의면접을 시작하지 못했습니다.");
        setPhase("idle");
        return;
      }
      setSession({ sessionId: body.sessionId, maxTurns: body.maxTurns ?? 5 });
      // 이어받은 세션이면 pendingQuestion이 이미 답한 다음 질문이고,
      // 새 세션이면 첫 시드 질문이다 — 둘 다 서버가 정해서 내려준다.
      setCurrentQuestion(body.pendingQuestion ?? body.seedQuestions[0].question);
      setHistory(body.history ?? []);
      setFinalReport(null);
      setAnswer("");
      setPhase("active");
    } catch {
      setMessage("모의면접을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setPhase("idle");
    }
  }

  async function buyRetry(focusQuestionIds?: string[]) {
    setPhase("busy");
    setMessage("");
    try {
      if (isGooglePlayBillingAvailable()) {
        const { purchaseToken, productId } = await purchaseInterviewRetryViaGooglePlay();
        const response = await fetch("/api/interview/retry/google-play/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ analysisRunId, purchaseToken, productId }),
        });
        const body = await response.json().catch(() => ({})) as { paid?: boolean; error?: string };
        if (!response.ok || !body.paid) {
          setMessage(body.error ?? "구매를 확인하지 못했습니다.");
          setPhase("payment");
          return;
        }
        await start(focusQuestionIds);
        return;
      }

      const response = await fetch("/api/interview/retry/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ analysisRunId }),
      });
      const body = await response.json().catch(() => ({})) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !body.checkoutUrl) {
        setMessage(body.error ?? "결제 페이지로 연결하지 못했습니다.");
        setPhase("payment");
        return;
      }
      if (focusQuestionIds) sessionStorage.setItem(RETRY_FOCUS_STORAGE_KEY, JSON.stringify(focusQuestionIds));
      else sessionStorage.removeItem(RETRY_FOCUS_STORAGE_KEY);
      window.location.assign(body.checkoutUrl);
    } catch {
      setMessage("결제를 진행하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setPhase("payment");
    }
  }

  async function submitAnswer() {
    if (!session || !answer.trim()) return;
    setPhase("busy");
    setMessage("");
    try {
      const response = await fetch("/api/interview/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, question: currentQuestion, answer: answer.trim() }),
      });
      const body = await response.json().catch(() => ({})) as {
        evaluation?: InterviewEvaluation; nextQuestion?: string; isReadyToFinish?: boolean; error?: string; shouldFinish?: boolean;
      };
      if (!response.ok || !body.evaluation || !body.nextQuestion) {
        // 같은 턴이 3번 실패하면 서버가 shouldFinish를 보낸다 — 더 붙잡고
        // 재시도시키지 않고 지금까지 답한 턴으로 마무리한다.
        if (body.shouldFinish) {
          setMessage("이 질문은 계속 처리되지 않아 넘어갑니다. 지금까지 답한 내용으로 리포트를 만듭니다.");
          await finish(session.sessionId);
          return;
        }
        setMessage(body.error ?? "답변을 평가하지 못했습니다.");
        setPhase("active");
        return;
      }
      const newHistory = [...history, { question: currentQuestion, answer: answer.trim(), evaluation: body.evaluation }];
      setHistory(newHistory);
      setAnswer("");

      if (body.isReadyToFinish) {
        await finish(session.sessionId);
        return;
      }
      setCurrentQuestion(body.nextQuestion);
      setPhase("active");
    } catch {
      setMessage("답변을 평가하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setPhase("active");
    }
  }

  async function finish(sessionId: string) {
    setPhase("busy");
    try {
      const response = await fetch("/api/interview/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const body = await response.json().catch(() => ({})) as { finalReport?: InterviewReport; error?: string };
      if (!response.ok || !body.finalReport) {
        setMessage(body.error ?? "리포트를 만들지 못했습니다.");
        setPhase("active");
        return;
      }
      setFinalReport(body.finalReport);
      setPhase("report");
    } catch {
      setMessage("리포트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setPhase("active");
    }
  }

  const weakQuestionIds = [...new Set((finalReport?.weakAreas ?? []).flatMap((area) => area.relatedQuestionIds))]
    .filter((id) => result.interviewQuestions.some((question) => question.id === id));

  if (phase === "payment") {
    return (
      <section className={styles.wrap}>
        <div className={styles.head}>
          <span>AI 모의면접</span>
          <h2>무료 재시도를 모두 사용했습니다</h2>
          <p>
            {pendingFocusQuestionIds ? "약점만 다시 연습하기" : "처음부터 다시 연습하기"}는 각각 1회 무료로 제공됩니다.
            추가로 진행하려면 3,000원을 결제해 주세요.
          </p>
        </div>
        {message && <p className={styles.message}>{message}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.primaryButton} onClick={() => void buyRetry(pendingFocusQuestionIds)}>
            3,000원 결제하고 다시하기
          </button>
          <button type="button" className={styles.ghostButton} onClick={() => { setMessage(""); setPhase("idle"); }}>
            취소
          </button>
        </div>
      </section>
    );
  }

  if (phase === "report" && finalReport) {
    return (
      <section className={styles.wrap}>
        <div className={styles.head}>
          <span>AI 모의면접 결과</span>
          <h2>최종 리포트</h2>
          <p>{finalReport.summary}</p>
        </div>

        {finalReport.strengthAreas.length > 0 && (
          <div className={styles.block}>
            <h3>잘한 점</h3>
            <ul>{finalReport.strengthAreas.map((item, index) => <li key={index}>{item}</li>)}</ul>
          </div>
        )}

        {finalReport.weakAreas.length > 0 && (
          <div className={styles.block}>
            <h3>더 준비하면 좋을 부분</h3>
            <ul className={styles.weakList}>
              {finalReport.weakAreas.map((area, index) => (
                <li key={index}>
                  <b>{area.topic}</b>
                  <p className={styles.quote}>{area.evidence}</p>
                  <p className={styles.reason}>{area.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {finalReport.likelyInterviewRisks.length > 0 && (
          <div className={styles.block}>
            <h3>실제 면접에서 나올 수 있는 상황</h3>
            <ul className={styles.weakList}>
              {finalReport.likelyInterviewRisks.map((risk, index) => (
                <li key={index}>
                  <b>{risk.situation}</b>
                  <p className={styles.reason}>{risk.reason}</p>
                  <p className={styles.quote}>{risk.evidence}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.block}>
          <h3>다음에 할 것</h3>
          <ul>{finalReport.recommendedNextSteps.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>

        {message && <p className={styles.message}>{message}</p>}

        <div className={styles.actions}>
          {weakQuestionIds.length > 0 && (
            <button type="button" className={styles.primaryButton} onClick={() => void start(weakQuestionIds)}>
              약점만 다시 연습하기
            </button>
          )}
          <button type="button" className={styles.ghostButton} onClick={() => void start()}>
            처음부터 다시 연습하기
          </button>
        </div>

        <p className={styles.footnote}>합격 여부나 가능성은 판단하지 않습니다. 실제로 답한 내용만 근거로 삼습니다.</p>
      </section>
    );
  }

  if (phase === "idle") {
    return (
      <section className={styles.wrap}>
        <div className={styles.head}>
          <span>AI 모의면접</span>
          <h2>AI와 직접 연습하기</h2>
          <p>
            방금 나온 면접 예상질문으로 실제 텍스트 면접을 진행합니다. 답변마다 평가와 꼬리질문이 이어지고,
            끝나면 리포트로 정리해 드립니다. 중간에 다른 화면에 갔다 와도 이어서 진행됩니다.
          </p>
        </div>
        {message && <p className={styles.message}>{message}</p>}
        <button type="button" className={styles.primaryButton} onClick={() => void start()}>
          모의면접 시작하기
        </button>
      </section>
    );
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.head}>
        <span>AI 모의면접 · {history.length + 1} / {session?.maxTurns ?? "?"}</span>
        <h2>{currentQuestion}</h2>
      </div>

      {history.length > 0 && (
        <ul className={styles.history}>
          {history.map((turn, index) => (
            <li key={index}>
              <b>{turn.question}</b>
              <p className={styles.answerText}>{turn.answer}</p>
              {turn.evaluation.strengths.length > 0 && <p className={styles.strength}>잘한 점: {turn.evaluation.strengths.join(" · ")}</p>}
              {turn.evaluation.gaps.length > 0 && <p className={styles.gap}>더 필요한 것: {turn.evaluation.gaps.join(" · ")}</p>}
            </li>
          ))}
        </ul>
      )}

      <textarea
        className={styles.answerBox}
        rows={4}
        maxLength={4000}
        value={answer}
        disabled={phase === "busy"}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="실제 면접이라 생각하고 답해 보세요."
      />

      {message && <p className={styles.message}>{message}</p>}

      <button type="button" className={styles.primaryButton} disabled={phase === "busy" || !answer.trim()} onClick={() => void submitAnswer()}>
        {phase === "busy" ? "평가하는 중..." : "답변 제출"}
      </button>
    </section>
  );
}
