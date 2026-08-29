"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, CloudUpload, LoaderCircle, LogIn, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WORK_STYLE_TEST_VERSION, type WorkStyleAnswer } from "@/domain/career-assessment";
import { INTEREST_TEST_VERSION, type InterestAnswer } from "@/domain/career-interest";
import { type WorkValueAnswer } from "@/domain/career-work-values";
import styles from "./career-profile-save.module.css";

const assessments = [
  { code: "work_style", version: WORK_STYLE_TEST_VERSION, key: "mooa-work-style-answers-v1", label: "업무성향" },
  { code: "interest", version: INTEREST_TEST_VERSION, key: "mooa-career-interest-answers-v1", label: "직업흥미" },
  { code: "work_values", version: "mooa-work-values-exploration-kr-beta-v1", key: "mooa-career-work-values-v1", label: "직업가치" },
] as const;
type StoredAnswers = Record<string, WorkStyleAnswer | InterestAnswer | WorkValueAnswer>;
type SaveState = "idle" | "saving" | "saved" | "needs-login" | "unavailable" | "error";

function readCompletedAssessments() {
  return assessments.flatMap((assessment) => {
    try { const raw = window.sessionStorage.getItem(assessment.key); const answers = raw ? (JSON.parse(raw) as StoredAnswers) : null; return answers && Object.keys(answers).length ? [{ ...assessment, answers }] : []; } catch { return []; }
  });
}

export function CareerProfileSave() {
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("완료한 검사 결과를 계정에 안전하게 보관할 수 있어요.");
  const completed = useMemo(() => typeof window === "undefined" ? [] : readCompletedAssessments(), []);
  async function save() {
    setState("saving"); setMessage("로그인과 저장 상태를 확인하고 있어요.");
    try {
      const { data, error } = await createClient().auth.getUser();
      if (error || !data.user) { setState("needs-login"); setMessage("계정에 보관하려면 먼저 로그인해 주세요. 검사 응답은 이 브라우저에 그대로 남아 있어요."); return; }
      const labels = await Promise.all(completed.map(async (assessment) => {
        const response = await fetch("/api/career-assessments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assessmentCode: assessment.code, assessmentVersion: assessment.version, answers: assessment.answers }) });
        const body = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(body.error ?? "저장에 실패했습니다.");
        return assessment.label;
      }));
      setState("saved"); setMessage(`${labels.join(" · ")} 결과를 계정에 저장했어요. 같은 검사를 다시 완료하면 새 기록으로 보관됩니다.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "저장에 실패했습니다.";
      setState(detail.includes("데이터베이스 적용 상태") ? "unavailable" : "error");
      setMessage(detail.includes("데이터베이스 적용 상태") ? "저장 기능은 준비됐지만, 운영 데이터베이스 연결 전입니다. 현재 결과는 이 브라우저에 안전하게 유지됩니다." : detail);
    }
  }
  return <main className={styles.page}>
    <section className={styles.intro}><span className={styles.eyebrow}><CloudUpload />CAREER PROFILE STORAGE</span><h1>내 결과를<br />계정에 보관하기</h1><p>이 기기의 완료 결과 {completed.length}개를 내 계정에 저장합니다. 저장 후에는 종합 커리어 프로필과 지원서 해설에서 사용자가 직접 선택해 연결할 수 있습니다.</p></section>
    <section className={styles.card}><div className={styles.cardHeader}><span>저장 대상</span><b>{completed.length} / 3개 완료</b></div><ul className={styles.list}>{assessments.map((assessment) => { const done = completed.some((item) => item.code === assessment.code); return <li key={assessment.code} className={done ? styles.complete : ""}><span>{done ? <CheckCircle2 /> : "—"}</span><div><b>{assessment.label}</b><small>{done ? "현재 기기에 완료 결과가 있습니다." : "아직 완료하지 않았습니다."}</small></div></li>; })}</ul></section>
    <section className={styles.notice}><ShieldCheck /><p><b>저장 전 안내</b> 검사지 응답과 계산된 점수만 내 계정에 저장합니다. 이 결과는 진단·채용 예측·직업 적합 판정이 아니며, AI 해설은 별도의 자료 선택과 실행 없이는 호출되지 않습니다.</p></section>
    <div className={styles.actions}><Link href="/career/profile" className={styles.secondary}>종합 프로필로 돌아가기</Link><button type="button" className={styles.primary} onClick={save} disabled={state === "saving" || completed.length === 0}>{state === "saving" ? <LoaderCircle className={styles.spin} /> : state === "needs-login" ? <LogIn /> : <CloudUpload />}{state === "saving" ? "저장 중" : state === "needs-login" ? "로그인 필요" : "내 계정에 저장"}</button></div>
    <p className={styles.message} aria-live="polite">{message}</p>{state === "needs-login" && <Link className={styles.inline} href="/career/login?next=/career/profile">로그인 화면으로 이동</Link>}
  </main>;
}
