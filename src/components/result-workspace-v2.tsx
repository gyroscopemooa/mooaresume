"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Clipboard,
  Download, FileText, Lightbulb, LockKeyhole, PencilLine, RotateCcw, Sparkles,
} from "lucide-react";
import { buildFinalDocumentText, countCompactCharacters, type ResultDocument } from "@/domain/result-document";
import { sampleResultDocument } from "@/fixtures/result-document";
import { FinalUpgradeCard } from "@/components/final-upgrade-card";
import { ApplicationTrackerCard } from "@/components/application-tracker-card";
import { CandidateProfileCard } from "@/components/candidate-profile-card";
import styles from "./result-workspace-v2.module.css";

type View = "overview" | "revision" | "fit" | "interview" | "final";

export function ResultWorkspaceV2({ result = sampleResultDocument }: { result?: ResultDocument }) {
  const storageKey = "mooa:result-edits:" + result.caseId + ":v1";
  const [view, setView] = useState<View>("overview");
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries(result.questions.map((question) => [question.id, question.revisedAnswer])));
  const [editing, setEditing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
        if (saved && typeof saved === "object" && !Array.isArray(saved)) {
          setAnswers(Object.fromEntries(result.questions.map((question) => {
            const value = (saved as Record<string, unknown>)[question.id];
            return [question.id, typeof value === "string" ? value : question.revisedAnswer];
          })));
        }
      } catch {
        sessionStorage.removeItem(storageKey);
      }
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [result.questions, storageKey]);

  useEffect(() => {
    if (restored) sessionStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, restored, storageKey]);

  const finalText = useMemo(() => buildFinalDocumentText(result, answers), [answers, result]);

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied((current) => current === id ? null : current), 1400);
  }

  function download() {
    const url = URL.createObjectURL(new Blob([finalText], { type: "text/plain;charset=utf-8" }));
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = "MOOA_" + result.company + "_" + result.role + "_최종첨삭본.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const tabs: Array<[View, string, boolean]> = [
    ["overview", "한눈에 보기", false],
    ["revision", "문항별 첨삭", false],
    ["fit", "공고·경험 분석", true],
    ["interview", "면접 준비", true],
    ["final", "최종 첨삭본", false],
  ];

  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><span>M</span>MOOA <b>Resume</b></Link>
      <div><button onClick={() => copy("all", finalText)}>{copied === "all" ? <Check/> : <Clipboard/>}{copied === "all" ? "복사됨" : "전체 복사"}</button><button onClick={download}><Download/> TXT 저장</button></div>
    </header>

    <div className={styles.container}>
      <Link href="/onboarding" className={styles.back}><ArrowLeft/> 작성 단계로 돌아가기</Link>
      <section className={styles.hero}>
        <div><span>{result.isSample ? "가상 지원서 · 결과 화면 샘플" : "분석 완료"}</span><h1>{result.company} <em>{result.role}</em></h1><p>{result.applicationLabel} · {result.questions.length}개 문항 · {result.product}</p></div>
        <button onClick={() => setView("final")}>최종 첨삭본 보기 <ArrowRight/></button>
      </section>

      <nav className={styles.tabs}>{tabs.filter((tab) => !tab[2] || result.product === "PRO").map(([id,label,pro]) => <button key={id} onClick={() => setView(id)} className={view === id ? styles.active : ""}>{label}{pro && <small>PRO</small>}</button>)}</nav>

      {view === "overview" && <section className={styles.overview}>
        <div className={styles.score}><div><small>지원서 준비도 · 샘플</small><strong>{result.readiness.score}<span>/100</span></strong><em>{result.readiness.label}</em></div><p>{result.readiness.summary}</p></div>
        <div className={styles.overviewGrid}>
          <section className={styles.panel}><span className={styles.eyebrow}>가장 먼저 확인하세요</span><h2>핵심 개선점 3가지</h2>{result.priorities.map((item,index) => <article className={styles.priority} key={item.id}><span>{String(index+1).padStart(2,"0")}</span><div><h3>{item.title}</h3><p>{item.description}</p></div></article>)}<button className={styles.wideButton} onClick={() => setView("revision")}>문항별 수정 내용 확인 <ArrowRight/></button></section>
          <aside>
            <CandidateProfileCard caseId={result.caseId} profile={result.candidateProfile} isSample={result.isSample}/>
            <section className={styles.panel}><span className={styles.eyebrow}>분석한 원본</span>{result.attachments.map((file) => <div className={styles.file} key={file.id}><FileText/><span><b>{file.filename}</b><small>{file.extension} · {(file.sizeBytes/1024).toFixed(0)}KB · {file.sectionCount}개 문항</small></span><em><CheckCircle2/> 읽기 완료</em></div>)}<p className={styles.privacy}><LockKeyhole/> 원본은 수정하지 않고 결과와 분리해 보관합니다.</p></section>
            <section className={styles.warning}><AlertCircle/><div><b>확인이 필요한 사실</b><p>{result.verificationQuestions[0]}</p><small>확인되지 않은 성과는 만들지 않았습니다.</small></div></section>
          </aside>
        </div>
      </section>}

      {view === "revision" && <section className={styles.workspace}>
        <div className={styles.title}><div><span className={styles.eyebrow}>BEFORE → AFTER</span><h2>문항별 첨삭 결과</h2></div><p>기본은 읽기 모드입니다. 필요한 문항만 직접 수정하세요.</p></div>
        {result.questions.map((question) => {
          const answer = answers[question.id] ?? question.revisedAnswer;
          const isEditing = editing === question.id;
          const changed = answer !== question.revisedAnswer;
          return <article className={styles.question} key={question.id}>
            <header><div><span>문항 {question.order}</span><h3>{question.title}</h3></div><div>{changed && <em>내 수정본</em>}<small>{countCompactCharacters(answer)} / {question.targetLength}자</small></div></header>
            <p className={styles.prompt}>{question.prompt}</p>
            <div className={styles.compare}><section><small>첨삭 전</small><p>{question.originalAnswer}</p></section><section><div><small>첨삭 후</small>{isEditing ? <PencilLine/> : <Sparkles/>}</div>{isEditing ? <textarea autoFocus rows={8} value={answer} onChange={(event) => setAnswers((current) => ({...current,[question.id]:event.target.value}))}/> : <p className={styles.after}>{answer}</p>}</section></div>
            <div className={styles.reasons}><Lightbulb/><div><b>왜 바뀌었나요?</b><ul>{question.revisionReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>{question.verificationNote && <p><AlertCircle/> {question.verificationNote}</p>}</div></div>
            <footer>{changed && <button onClick={() => setAnswers((current) => ({...current,[question.id]:question.revisedAnswer}))}><RotateCcw/> AI 수정본으로 되돌리기</button>}<span/><button onClick={() => setEditing((current) => current === question.id ? null : question.id)}><PencilLine/> {isEditing ? "수정 완료" : "직접 수정"}</button><button className={styles.copy} onClick={() => copy(question.id,answer)}>{copied === question.id ? <Check/> : <Clipboard/>}{copied === question.id ? "복사됨" : "이 문항 복사"}</button></footer>
          </article>;
        })}
      </section>}

      {view === "fit" && <section className={styles.workspace}><div className={styles.title}><div><span className={styles.eyebrow}>JOB FIT</span><h2>공고 요구와 경험 연결</h2></div><p>공고 요구와 지원서에 실제로 있는 근거를 비교했습니다.</p></div><div className={styles.matches}>{result.requirementMatches.map((match) => <article key={match.id} data-status={match.status}><div>{match.status === "matched" ? <CheckCircle2/> : <AlertCircle/>}<b>{match.status === "matched" ? "근거 있음" : match.status === "partial" ? "보완 필요" : "근거 없음"}</b></div><section><h3>{match.requirement}</h3><p><b>현재 근거</b>{match.evidence}</p><p><b>권장 행동</b>{match.recommendation}</p></section></article>)}</div><div className={styles.fact}><LockKeyhole/><p><b>지원자료에 있는 사실만 사용합니다.</b> 근거가 없는 역량은 문장으로 만들지 않고 확인 필요 상태로 남깁니다.</p></div></section>}

      {view === "interview" && <section className={styles.workspace}><div className={styles.title}><div><span className={styles.eyebrow}>INTERVIEW PREVIEW</span><h2>지원서에서 이어질 예상질문</h2></div><p>작성한 내용의 진위와 판단 과정을 확인할 가능성이 높은 질문입니다.</p></div><div className={styles.interviews}>{result.interviewQuestions.map((item,index) => <article key={item.id}><span>Q{index+1}</span><div><h3>{item.question}</h3><p>{item.reason}</p><section><b>답변에 포함할 내용</b>{item.answerGuide.map((guide) => <em key={guide}>{guide}</em>)}</section></div></article>)}</div></section>}

      {view === "final" && <section className={styles.final}><header><div><span className={styles.eyebrow}>제출용 최종 문장</span><h2>최종 첨삭본</h2><p>비교와 피드백을 제외하고 복사·제출할 답변만 모았습니다.</p></div><div><button onClick={() => copy("all",finalText)}>{copied === "all" ? <Check/> : <Clipboard/>}{copied === "all" ? "복사됨" : "전체 복사"}</button><button onClick={download}><Download/> TXT 저장</button></div></header>{result.questions.map((question) => {const answer=answers[question.id]??question.revisedAnswer;const copyId=`final-${question.id}`;const answerLength=countCompactCharacters(answer);return <article key={question.id}><span>{String(question.order).padStart(2,"0")}</span><div><div className={styles.finalQuestionHead}><h3>{question.title}</h3><button onClick={() => copy(copyId,answer)}>{copied === copyId ? <Check/> : <Clipboard/>}{copied === copyId ? "복사됨" : "이 문항 복사"}</button></div><p>{answer}</p><small data-short={answerLength < question.targetLength * .7}>공백 제외 {answerLength} / {question.targetLength}자{answerLength < question.targetLength * .7 ? " · 분량 보완 필요" : ""}</small></div></article>})}<footer><CheckCircle2/><p><b>이 화면의 문장이 복붙용 최종 첨삭본입니다.</b> 문항별 첨삭에서 직접 고친 내용도 여기에 자동 반영됩니다.</p><span>DOCX · PDF 내보내기 예정</span></footer></section>}
      {view === "final" && <ApplicationTrackerCard caseId={result.caseId} company={result.company} role={result.role} isSample={result.isSample} onPrepareInterview={() => setView("interview")} onReviewIssues={() => setView("overview")} />}
      {view === "final" && <FinalUpgradeCard />}
    </div>
  </main>;
}
