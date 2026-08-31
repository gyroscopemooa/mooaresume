"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, Gift, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import {
  appendTrackerEvent,
  applicationTrackerSchema,
  type ApplicationTracker,
  type ApplicationTrackerStatus,
} from "@/domain/application-tracker";
import { OUTCOME_REWARD_PROMISE, describeOutcomeReward, parseOutcomeReward } from "@/domain/outcome-reward";
import { createClient } from "@/lib/supabase/client";
import styles from "./application-tracker-card.module.css";

type Props = {
  caseId: string;
  company: string;
  role: string;
  isSample: boolean;
  onPrepareInterview: () => void;
  onReviewIssues: () => void;
};

const labels: Record<ApplicationTrackerStatus, string> = {
  NOT_SUBMITTED: "아직 제출 전",
  SUBMITTED: "지원 완료",
  RESULT_PENDING: "서류 결과 대기",
  DOCUMENT_PASS: "서류 합격",
  DOCUMENT_FAIL: "서류 불합격",
  INTERVIEW_1_PENDING: "1차 면접 진행",
  INTERVIEW_1_PASS: "1차 면접 합격",
  INTERVIEW_1_FAIL: "1차 면접 불합격",
  FINAL_INTERVIEW_PENDING: "최종 면접 진행",
  FINAL_PASS: "최종 합격",
  FINAL_FAIL: "최종 불합격",
  WITHDRAWN: "지원 철회",
  UNKNOWN: "결과 확인 필요",
};

function initialTracker(caseId: string, company: string, role: string): ApplicationTracker {
  return { schemaVersion: "1.0", caseId, company, role, currentStatus: "NOT_SUBMITTED", events: [] };
}

export function ApplicationTrackerCard(props: Props) {
  const storageKey = "mooa:application-tracker:" + props.caseId + ":v1";
  const [tracker, setTracker] = useState(() => initialTracker(props.caseId, props.company, props.role));
  const [ready, setReady] = useState(false);
  const [rewardNotice, setRewardNotice] = useState<string | null>(null);
  const [reportFailed, setReportFailed] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
        const parsed = applicationTrackerSchema.safeParse(saved);
        if (parsed.success) setTracker(parsed.data);
      } catch {
        sessionStorage.removeItem(storageKey);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [storageKey]);

  useEffect(() => {
    if (ready) sessionStorage.setItem(storageKey, JSON.stringify(tracker));
  }, [ready, storageKey, tracker]);

  /**
   * Also sends the outcome to the server.
   *
   * This card has always written its state to sessionStorage and nowhere else,
   * so every "서류 합격" anyone ever clicked was lost when the tab closed —
   * and that click is the single most valuable thing this product could learn
   * from. The local write stays exactly as it was; the server call is added
   * beside it and is not allowed to fail loudly, because the card is the
   * applicant's own tracker first and our data second.
   */
  function transition(status: ApplicationTrackerStatus) {
    setTracker((current) => appendTrackerEvent(current, status));
    if (props.isSample) return;
    void (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("record_application_outcome", {
          p_application_case_id: props.caseId,
          p_status: status,
        });
        // 보고가 서버에 남지 않으면 보상도 없습니다.
        //
        // The tick on screen comes from this browser's own storage, so a failed
        // call still looks like a saved report — and the free ticket that a
        // 합격/불합격 report earns simply never arrives, with nothing said.
        if (error) {
          console.error("record_application_outcome", error);
          setReportFailed([error.code, error.message].filter(Boolean).join(" · "));
          return;
        }
        // Null means say nothing: the credit is a thank-you, and a notice
        // explaining why one did *not* arrive reads as a refusal for having
        // pressed the wrong button.
        setRewardNotice(describeOutcomeReward(parseOutcomeReward(data)));
      } catch (error) {
        console.error("record_application_outcome", error);
        setReportFailed(error instanceof Error ? error.message : "알 수 없는 오류");
      }
    })();
  }

  function confirmSubmission() {
    const now = new Date().toISOString();
    const submitted: ApplicationTracker = {
      ...tracker,
      submissionSnapshotId: props.caseId + "-submission-" + Date.now(),
      submittedAt: now,
      currentStatus: "SUBMITTED",
      events: [...tracker.events, {
        id: props.caseId + "-event-" + (tracker.events.length + 1),
        status: "SUBMITTED",
        occurredAt: now,
        collectionMode: "ORGANIC",
        verification: "SELF_REPORTED",
      }],
    };
    setTracker(appendTrackerEvent(submitted, "RESULT_PENDING", now));
  }

  function reset() {
    sessionStorage.removeItem(storageKey);
    setTracker(initialTracker(props.caseId, props.company, props.role));
  }

  const status = tracker.currentStatus;
  return <section className={styles.card}>
    <header>
      <div className={styles.icon}><BriefcaseBusiness /></div>
      <div><span>MY APPLICATIONS {props.isSample && "· 기능 프로토타입"}</span><h2>나의 지원 현황 관리하기</h2><p>지원부터 결과까지 한곳에서 기록하고 다음 준비로 이어가세요.</p></div>
      {status !== "NOT_SUBMITTED" && <button className={styles.reset} onClick={reset}><RotateCcw /> 초기화</button>}
    </header>

    {status === "NOT_SUBMITTED" ? <div className={styles.submitPrompt}>
      <div><em>{props.company} · {props.role}</em><b>이 버전으로 실제 지원하셨나요?</b><p>제출본을 기록해두면 서류 결과와 면접 준비를 같은 지원 건에서 계속 관리할 수 있어요.</p></div>
      <div><button className={styles.primary} onClick={confirmSubmission}>이 버전으로 제출했어요 <ArrowRight /></button><button onClick={() => transition("WITHDRAWN")}>지원하지 않기로 했어요</button></div>
      <small><ShieldCheck /> {props.isSample ? "지금 누른 내용은 체험용으로 이 브라우저 세션에만 저장되며 서버로 전송되지 않습니다." : "내 지원 기록은 비공개로 저장되며 사용자 본인이 언제든 수정할 수 있습니다."}</small>
    </div> : <div className={styles.tracker}>
      <div className={styles.current}>
        <small>현재 상태</small>
        <strong data-status={status}>{status.includes("PASS") ? <CheckCircle2 /> : status.includes("FAIL") ? <XCircle /> : <Clock3 />}{labels[status]}</strong>
        {tracker.submittedAt && <span>{new Date(tracker.submittedAt).toLocaleDateString("ko-KR")} 제출 확인</span>}
      </div>
      <div className={styles.actions}>
        {status === "RESULT_PENDING" && <><b>서류 결과가 나왔나요?</b><div><button onClick={() => transition("DOCUMENT_PASS")}>서류 합격</button><button onClick={() => transition("DOCUMENT_FAIL")}>서류 불합격</button><button onClick={() => transition("UNKNOWN")}>아직 확인하지 못했어요</button></div></>}
        {status === "UNKNOWN" && <><b>결과를 확인하면 다시 대기 상태로 바꿀 수 있어요.</b><div><button onClick={() => transition("RESULT_PENDING")}>결과 다시 확인하기</button></div></>}
        {status === "DOCUMENT_PASS" && <><b>축하해요. 이제 이 제출본을 기준으로 면접을 준비할 차례예요.</b><div><button className={styles.primary} onClick={props.onPrepareInterview}>예상 질문 확인 <ArrowRight /></button><button onClick={() => transition("INTERVIEW_1_PENDING")}>면접 진행으로 변경</button></div></>}
        {status === "DOCUMENT_FAIL" && <><b>이번 지원 기록은 보관하고, 다음 지원에서 먼저 보완할 부분을 확인해 보세요.</b><div><button onClick={props.onReviewIssues}>핵심 개선점 다시 보기</button></div></>}
        {status === "INTERVIEW_1_PENDING" && <><b>1차 면접 결과를 업데이트하세요.</b><div><button onClick={() => transition("INTERVIEW_1_PASS")}>1차 면접 합격</button><button onClick={() => transition("INTERVIEW_1_FAIL")}>1차 면접 불합격</button></div></>}
        {status === "INTERVIEW_1_PASS" && <><b>다음 단계가 최종 면접인가요?</b><div><button onClick={() => transition("FINAL_INTERVIEW_PENDING")}>최종 면접 진행</button><button onClick={() => transition("FINAL_PASS")}>최종 합격</button></div></>}
        {status === "FINAL_INTERVIEW_PENDING" && <><b>최종 결과를 업데이트하세요.</b><div><button onClick={() => transition("FINAL_PASS")}>최종 합격</button><button onClick={() => transition("FINAL_FAIL")}>최종 불합격</button></div></>}
        {["INTERVIEW_1_FAIL","FINAL_PASS","FINAL_FAIL","WITHDRAWN"].includes(status) && <b>이 지원 건의 현재 기록을 저장했어요.</b>}
        {/* Before the buttons, not after. Someone who reads "합격하면 이용권"
            after clicking 불합격 learns that honesty costs money here. */}
        {!props.isSample && ["RESULT_PENDING","INTERVIEW_1_PENDING","FINAL_INTERVIEW_PENDING"].includes(status)
          && <small className={styles.rewardPromise}><Gift /> {OUTCOME_REWARD_PROMISE}</small>}
        {rewardNotice && <p className={styles.rewardNotice}><Gift /> {rewardNotice}</p>}
        {reportFailed && <p className={styles.reportFailed}><b>결과를 서버에 기록하지 못했습니다.</b> 화면의 표시는 이 브라우저에만 남아 있고, 결과 보고로 드리는 무료 이용권도 지급되지 않았습니다. 잠시 후 다시 눌러 주세요. <em>{reportFailed}</em></p>}
      </div>
      <ol>{tracker.events.map((event) => <li key={event.id}><span/><div><b>{labels[event.status]}</b><small>{new Date(event.occurredAt).toLocaleString("ko-KR")} · 자발적 입력 · 미인증</small></div></li>)}</ol>
    </div>}
  </section>;
}
