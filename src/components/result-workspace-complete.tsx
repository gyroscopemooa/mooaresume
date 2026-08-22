"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Clipboard,
  Download, FileText, GitCompareArrows, Lightbulb, LockKeyhole, PencilLine, RotateCcw, Sparkles,
} from "lucide-react";
import { buildFinalDocumentText, countCompactCharacters, type ResultDocument, type ResultOriginalAnnotation } from "@/domain/result-document";
import { recommendNextStep } from "@/domain/next-step";
import { saveGuestDraft } from "@/lib/guest-draft";
import { createCoverLetterQuestion } from "@/domain/cover-letter-question";
import { deriveFallbackOriginalAnnotations } from "@/domain/result-original-annotations";
import { resolveApplicationLabel, resolveQuestionTitle, resolveResultSubject, toFilenameToken } from "@/domain/result-labels";
import { buildDocx, DOCX_MIME_TYPE } from "@/lib/docx";
import { sampleResultDocument } from "@/fixtures/result-document";
import { diffText } from "@/lib/text-diff";
import { FinalUpgradeCard } from "@/components/final-upgrade-card";
import { ApplicationTrackerCard } from "@/components/application-tracker-card";
import { CandidateProfileCard } from "@/components/candidate-profile-card";
import styles from "./result-workspace-complete.module.css";

type View = "overview" | "submission" | "revision" | "fit" | "interview" | "final";

const ANNOTATION_LABEL: Record<ResultOriginalAnnotation["type"], string> = {
  good: "좋은 표현",
  delete: "삭제 추천",
  vague: "구체성 부족",
  revise: "수정 추천",
  fact: "확인 필요",
};

type AnnotationGroup = { start: number; end: number; phrase: string; items: ResultOriginalAnnotation[] };

function groupOriginalAnnotations(annotations: ResultOriginalAnnotation[]): { groups: AnnotationGroup[]; marks: AnnotationGroup[] } {
  const sorted = [...annotations].sort((left, right) => left.start - right.start || (right.end - right.start) - (left.end - left.start));
  const groups: AnnotationGroup[] = [];
  for (const item of sorted) {
    const previous = groups.at(-1);
    if (previous && item.start === previous.start && item.end === previous.end) previous.items.push(item);
    else groups.push({ start: item.start, end: item.end, phrase: item.phrase, items: [item] });
  }
  const marks: AnnotationGroup[] = [];
  for (const group of groups) {
    const previous = marks.at(-1);
    if (!previous || group.start >= previous.end) marks.push(group);
  }
  return { groups, marks };
}

function AnnotatedOriginal({ text, marks }: { text: string; marks: AnnotationGroup[] }) {
  const segments: Array<{ value: string; type?: ResultOriginalAnnotation["type"] }> = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.start > cursor) segments.push({ value: text.slice(cursor, mark.start) });
    segments.push({ value: text.slice(mark.start, mark.end), type: mark.items[0].type });
    cursor = mark.end;
  }
  if (cursor < text.length) segments.push({ value: text.slice(cursor) });
  return <p className={styles.annotatedText}>{segments.map((segment, index) => segment.type
    ? <mark key={index} data-type={segment.type}>{segment.value}</mark>
    : <span key={index}>{segment.value}</span>)}</p>;
}

/**
 * Marks the phrases the analysis called out inside the revised answer. The
 * data was being produced, validated and stored all along but never drawn, so
 * "강조 표시" existed only in the sample fixture.
 */
function HighlightedAnswer({ text, phrases }: { text: string; phrases: readonly string[] }) {
  const present = phrases.filter((phrase) => phrase && text.includes(phrase));
  if (present.length === 0) return <p className={styles.after}>{text}</p>;

  // Longest first so a phrase nested inside another still marks the wider span.
  const ordered = [...present].sort((a, b) => b.length - a.length);
  const parts: Array<{ value: string; marked: boolean }> = [{ value: text, marked: false }];
  for (const phrase of ordered) {
    for (let index = parts.length - 1; index >= 0; index -= 1) {
      const part = parts[index];
      if (part.marked) continue;
      const at = part.value.indexOf(phrase);
      if (at < 0) continue;
      parts.splice(index, 1, ...[
        { value: part.value.slice(0, at), marked: false },
        { value: phrase, marked: true },
        { value: part.value.slice(at + phrase.length), marked: false },
      ].filter((next) => next.value));
    }
  }

  return <p className={styles.after}>{parts.map((part, index) => part.marked
    ? <mark key={index} className={styles.highlight}>{part.value}</mark>
    : <span key={index}>{part.value}</span>)}</p>;
}

/**
 * Marks what changed from the applicant's own text. The spans come from the
 * same word-level diff the 변경점 표시 toggle uses, so nothing extra is stored.
 *
 * The label matters: Korean inflects at the end of almost every word, so a
 * rephrased sentence marks almost entirely. Calling that "what we wrote for
 * you" overstates it — calling it "what changed" is exactly what the diff
 * knows.
 */
function FilledAnswer({ original, revised }: { original: string; revised: string }) {
  return <p className={styles.after}>{diffText(original, revised)
    .filter((part) => part.type !== "removed")
    .map((part, index) => part.type === "added"
      ? <mark key={index} className={styles.filled}>{part.value}</mark>
      : <span key={index}>{part.value}</span>)}</p>;
}

/** A question that started empty has no original to diff against at all. */
function BlankOriginalNotice({ original }: { original: string }) {
  if (original.trim()) return null;
  return <p className={styles.fillNotice} data-kind="written">
    이 문항은 비워 두셨던 곳이라 <b>전체가 새로 쓴 제안</b>입니다. 사실과 맞는지 확인한 뒤 사용하세요.
  </p>;
}

function DiffAnswer({ original, revised, side }: { original: string; revised: string; side: "before" | "after" }) {
  return <p className={styles.diffText}>{diffText(original, revised).filter((part) => part.type === "equal" || (side === "before" ? part.type === "removed" : part.type === "added")).map((part, index) => <span key={`${part.type}-${index}`} className={part.type === "equal" ? undefined : part.type === "added" ? styles.added : styles.removed}>{part.value}</span>)}</p>;
}

/**
 * A blank question is not an analysis failure, it is a question with nothing to
 * analyse. Announcing only the exclusion leaves the applicant with no next step,
 * so the notice names the flow that actually covers it (CREATE) and repeats the
 * pre-payment wording from analysis-preparation verbatim, so the promise does
 * not change after the applicant has paid.
 */
function CoverageNotice({ notes }: { notes: readonly string[] }) {
  return <section className={styles.coverageNotice}><AlertCircle/><div>
    <b>빈 문항은 첨삭 대상이 아닙니다</b>
    {notes.map((note) => <p key={note}>{note}</p>)}
    <small>첨삭은 이미 쓴 글을 고치는 기능이라 원문이 있어야 동작합니다. 아직 내용을 못 쓴 문항은 &lsquo;처음부터 작성 · 아직 아무것도 못 썼어요&rsquo; 유형으로 진행해야 소재와 개요부터 함께 만들어 드립니다.</small>
    <small>작성되지 않은 문항 {notes.length}개는 첨삭·생성 대상에서 제외됩니다. 빈 문항까지 보완하려면 PRO · 내용 보완으로 진행해 주세요.</small>
    <small>문항 번호 줄만 있고 그 아래에 내용이 없으면 빈 문항으로 잡힙니다. 실제 문항이 아니라면 번호 줄을 지우고, 실제 문항이라면 내용을 채운 뒤 다시 분석해 주세요.</small>
    <Link href="/onboarding" className={styles.coverageLink}>작성 유형 다시 고르기 <ArrowRight/></Link>
  </div></section>;
}

export function ResultWorkspaceComplete({ result = sampleResultDocument }: { result?: ResultDocument }) {
  const storageKey = "mooa:result-edits:" + result.caseId + ":v1";
  const [view, setView] = useState<View>("overview");
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries(result.questions.map((question) => [question.id, question.revisedAnswer])));
  const [editing, setEditing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [showChanges, setShowChanges] = useState(false);

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

  const subject = useMemo(() => resolveResultSubject(result), [result]);
  const isFilledResult = result.writingMode === "BUILD";
  const applicationLabel = resolveApplicationLabel(result);
  // The shared builder is left untouched for the other result screens; the
  // resolved subject is handed to it instead of the stored placeholders.
  const nextStep = useMemo(() => recommendNextStep({
    product: result.product,
    writingMode: result.writingMode,
    shortQuestionCount: result.questions.filter((question) => countCompactCharacters(answers[question.id] ?? question.revisedAnswer) < question.targetLength * 0.7).length,
  }), [answers, result]);
  const finalText = useMemo(
    () => buildFinalDocumentText({ ...result, company: subject.name, role: subject.qualifier ?? applicationLabel, questions: result.questions.map((question) => ({ ...question, title: resolveQuestionTitle(question) })) }, answers),
    [answers, applicationLabel, result, subject],
  );
  const baseFilename = `MOOA_${toFilenameToken(subject.name)}_최종첨삭본`;

  const router = useRouter();
  const [revisionRequest, setRevisionRequest] = useState("");

  /**
   * Re-runs the analysis with an instruction attached.
   *
   * The draft it carries forward is what is on screen now — including anything
   * hand-edited — because that is the version the applicant is reacting to.
   * The request itself travels separately from the materials all the way down;
   * filed as a material, "leave 에이텍 out" reads as more material about 에이텍.
   */
  /**
   * Carries the finished draft into the next run and goes where it is needed.
   *
   * Both buttons on this screen used to be a dead end in the same way: one
   * pointed at /onboarding, which asks the applicant to type in a draft they
   * are looking at. What is on screen now — hand edits included — is the
   * version they are reacting to, so that is what travels.
   */
  function carryDraftForward(
    destination: string,
    options: { writingMode: "CREATE" | "BUILD" | "POLISH"; product: "QUICK" | "PRO"; revisionRequest?: string },
  ) {
    const questions = [...result.questions]
      .sort((left, right) => left.order - right.order)
      .map((question, index) => ({
        ...createCoverLetterQuestion(answers[question.id] ?? question.revisedAnswer, index),
        title: question.title,
        prompt: question.prompt,
        targetLength: question.targetLength,
      }));
    saveGuestDraft({
      draftText: finalText,
      questionDrafts: questions.map((question) => question.answer),
      questions,
      targetLength: result.questions[0]?.targetLength ?? 700,
      temporaryWritingMode: options.writingMode,
      selectedProduct: options.product,
      companyName: result.company,
      roleName: result.role,
      writingStyle: "BALANCED",
      revisionRequest: options.revisionRequest,
    });
    router.push(destination);
  }

  function startRevision() {
    if (!revisionRequest.trim()) return;
    // The draft is complete by now; what is wanted is another pass over it.
    carryDraftForward("/analysis/prepare", { writingMode: "POLISH", product: "PRO", revisionRequest: revisionRequest.trim() });
  }


  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied((current) => current === id ? null : current), 1400);
  }

  function save(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function download() {
    save(new Blob([finalText], { type: "text/plain;charset=utf-8" }), `${baseFilename}.txt`);
  }

  /**
   * Word and 한글 both open .docx directly. 한글's own .hwp is a closed binary
   * format, so this is the export that serves both without inventing a file
   * neither program can trust.
   */
  function downloadDocx() {
    const blocks = [
      { text: subject.qualifier ? `${subject.name} · ${subject.qualifier}` : subject.name, style: "title" as const },
      ...[...result.questions].sort((left, right) => left.order - right.order).flatMap((question) => [
        { text: `${question.order}. ${resolveQuestionTitle(question)}`, style: "heading" as const },
        ...(question.subheading ? [{ text: `[${question.subheading}]`, style: "body" as const }] : []),
        { text: answers[question.id] ?? question.revisedAnswer, style: "body" as const },
      ]),
    ];
    save(new Blob([buildDocx(blocks)], { type: DOCX_MIME_TYPE }), `${baseFilename}.docx`);
  }

  const tabs: Array<[View, string, boolean]> = [
    ["overview", "한눈에 보기", false],
    ["submission", "제출본", false],
    ["revision", "문항별 첨삭", false],
    ["fit", "공고·경험 분석", true],
    ["interview", "면접 준비", true],
    ["final", "최종 첨삭본", false],
  ];

  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><span>M</span>MOOA <b>Resume</b></Link>
      <div><em className={styles.completeBadge}>완성본</em><button onClick={() => copy("all", finalText)}>{copied === "all" ? <Check/> : <Clipboard/>}{copied === "all" ? "복사됨" : "전체 복사"}</button><button onClick={downloadDocx}><Download/> DOCX 저장</button><button onClick={download}><Download/> TXT 저장</button></div>
    </header>

    <div className={styles.container}>
      <Link href="/onboarding" className={styles.back}><ArrowLeft/> 작성 단계로 돌아가기</Link>
      <section className={styles.hero}>
        <div><span>{result.isSample ? "가상 지원서 · 결과 화면 샘플" : "분석 완료"}</span><h1>{subject.name}{subject.qualifier && <> <em>{subject.qualifier}</em></>}</h1><p>{applicationLabel} · {result.questions.length}개 문항 · {result.product}</p></div>
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
            {result.coverageNotes.length > 0 && <CoverageNotice notes={result.coverageNotes}/>}
            <section className={styles.warning}><AlertCircle/><div><b>확인이 필요한 사실</b><p>{result.verificationQuestions[0]}</p><small>확인되지 않은 성과는 만들지 않았습니다.</small></div></section>
          </aside>
        </div>
      </section>}

      {view === "submission" && <section className={styles.workspace}>
        <div className={styles.title}><div><span className={styles.eyebrow}>ORIGINAL</span><h2>제출본 피드백</h2></div><p>실제로 분석한 원문에서 좋은 표현과 보완이 필요한 부분을 확인합니다.</p></div>
        {result.coverageNotes.length > 0 && <CoverageNotice notes={result.coverageNotes}/>}
        {result.questions.map((question) => {
          const storedAnnotations = question.originalAnnotations ?? [];
          const annotations = deriveFallbackOriginalAnnotations(question);
          const usingFallback = storedAnnotations.length === 0 && annotations.length > 0;
          const { groups, marks } = groupOriginalAnnotations(annotations);
          return <article className={styles.question} key={question.id}>
            <header><div><span>문항 {question.order}</span><h3>{resolveQuestionTitle(question)}</h3></div></header>
            <div className={styles.submissionCompare}>
              <section><small>제출한 원문</small>{question.originalAnswer.trim() ? <AnnotatedOriginal text={question.originalAnswer} marks={marks}/> : <p className={styles.blankOriginal}>이 문항은 비워 두셨습니다. 오른쪽 첨삭본은 다른 문항과 지원자료의 사실로 새로 쓴 <b>제안</b>이니, 사실과 맞는지 확인해 주세요.</p>}</section>
              <aside>
                {usingFallback && <p className={styles.fallbackNotice}>이 결과는 원문 주석 저장 기능이 추가되기 전에 분석되어, 저장된 첨삭 전후 차이만으로 변경 구간을 표시했습니다. 분석 엔진을 다시 호출하지 않았습니다.</p>}
                {groups.length > 0 ? groups.map((group) => <div className={styles.annotationCard} key={`${group.start}-${group.end}`}>
                  <p className={styles.annotationQuote}>&ldquo;{group.phrase}&rdquo;</p>
                  {group.items.map((item) => <div key={item.id} data-type={item.type} className={styles.annotationItem}><span>{ANNOTATION_LABEL[item.type]}</span><p>{item.comment}</p>{item.suggestion && <p className={styles.annotationSuggestion}><b>이렇게 고쳐 보세요</b>{item.suggestion}</p>}</div>)}
                </div>) : <p className={styles.emptyAnnotation}>{question.originalAnswer.trim()
                  ? "제출 원문은 정상 연결됐습니다. 이 문항에는 별도로 표시할 변경 구간이 없습니다."
                  // Saying the submitted original "연결됐습니다" beside a question
                  // that was never written contradicts the panel on the left.
                  : "비워 두신 문항이라 짚어 드릴 원문이 없습니다. 새로 쓴 제안은 문항별 첨삭에서 확인하세요."}</p>}
              </aside>
            </div>
          </article>;
        })}
      </section>}

      {view === "revision" && <section className={styles.workspace}>
        <div className={styles.title}><div><span className={styles.eyebrow}>BEFORE → AFTER</span><h2>문항별 첨삭 결과</h2></div><button type="button" className={styles.diffToggle} aria-pressed={showChanges} onClick={() => setShowChanges((current) => !current)}><GitCompareArrows/>{showChanges ? "\uBCC0\uACBD\uC810 \uC228\uAE30\uAE30" : "\uBCC0\uACBD\uC810 \uD45C\uC2DC"}</button><p>기본은 읽기 모드입니다. 필요한 문항만 직접 수정하세요.</p></div>
        {isFilledResult && <p className={styles.filledLegend}><mark className={styles.filled}>파란색</mark>은 <b>원문에서 달라진 부분</b>입니다. 표현만 다듬은 곳도 포함되니, 새로 채워진 내용인지는 왼쪽 원문과 비교해 확인해 주세요. 없는 경험·수치는 넣지 않았지만 <b>제안</b>이므로 사실과 다르면 직접 고치시면 됩니다.</p>}
        {result.questions.map((question) => {
          const answer = answers[question.id] ?? question.revisedAnswer;
          const isEditing = editing === question.id;
          const changed = answer !== question.revisedAnswer;
          return <article className={styles.question} key={question.id}>
            <header><div><span>문항 {question.order}</span><h3>{resolveQuestionTitle(question)}</h3></div><div>{changed && <em>내 수정본</em>}<small>{countCompactCharacters(answer)} / {question.targetLength}자</small></div></header>
            <p className={styles.prompt}>{question.prompt}</p>
            <div className={styles.compare}><section><small>첨삭 전</small>{showChanges ? <DiffAnswer original={question.originalAnswer} revised={answer} side="before"/> : <p>{question.originalAnswer}</p>}</section><section><div><small>첨삭 후</small>{isEditing ? <PencilLine/> : <Sparkles/>}</div>{isEditing ? <textarea autoFocus rows={8} value={answer} onChange={(event) => setAnswers((current) => ({...current,[question.id]:event.target.value}))}/> : showChanges ? <DiffAnswer original={question.originalAnswer} revised={answer} side="after"/> : isFilledResult ? <FilledAnswer original={question.originalAnswer} revised={answer}/> : <HighlightedAnswer text={answer} phrases={question.highlightedPhrases}/>}{isFilledResult && <BlankOriginalNotice original={question.originalAnswer}/>}</section></div>
            <div className={styles.reasons}><Lightbulb/><div><b>왜 바뀌었나요?</b><ul>{question.revisionReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>{question.verificationNote && <p><AlertCircle/> {question.verificationNote}</p>}</div></div>
            <footer>{changed && <button onClick={() => setAnswers((current) => ({...current,[question.id]:question.revisedAnswer}))}><RotateCcw/> AI 수정본으로 되돌리기</button>}<span/><button onClick={() => setEditing((current) => current === question.id ? null : question.id)}><PencilLine/> {isEditing ? "수정 완료" : "직접 수정"}</button><button className={styles.copy} onClick={() => copy(question.id,answer)}>{copied === question.id ? <Check/> : <Clipboard/>}{copied === question.id ? "복사됨" : "이 문항 복사"}</button></footer>
          </article>;
        })}
        {result.consultingAdvice.length > 0 && <section className={styles.consulting}>
          <div><span className={styles.eyebrow}>{"\uCD94\uAC00 \uCEE8\uC124\uD305 \uD53C\uB4DC\uBC31"}</span><h3>{"\uB354 \uC88B\uC544\uC9C0\uAE30 \uC704\uD55C \uC2E4\uD589 \uC81C\uC548"}</h3></div>
          <div className={styles.adviceGrid}>{result.consultingAdvice.map((item, index) => <article key={item.id} data-priority={item.priority}><span>{String(index + 1).padStart(2, "0")}</span><div><h4>{item.title}</h4><p>{item.guidance}</p><small>{item.rationale}</small></div></article>)}</div>
        </section>}
      </section>}

      {view === "fit" && <section className={styles.workspace}><div className={styles.title}><div><span className={styles.eyebrow}>JOB FIT</span><h2>공고 요구와 경험 연결</h2></div><p>공고 요구와 지원서에 실제로 있는 근거를 비교했습니다.</p></div>{result.requirementMatches.length === 0 && <div className={styles.fact}><AlertCircle/><p><b>채용공고 내용이 충분하지 않아 요구역량을 대조하지 못했습니다.</b> 공고 원문을 붙여넣고 다시 분석하면 요구사항별로 지원서에 근거가 있는지 확인해 드립니다. 근거 없는 역량을 지어내지 않기 위해 비워 두었습니다.</p></div>}<div className={styles.matches}>{result.requirementMatches.map((match) => <article key={match.id} data-status={match.status}><div>{match.status === "matched" ? <CheckCircle2/> : <AlertCircle/>}<b>{match.status === "matched" ? "근거 있음" : match.status === "partial" ? "보완 필요" : "근거 없음"}</b></div><section><h3>{match.requirement}</h3><p><b>현재 근거</b>{match.evidence}</p><p><b>권장 행동</b>{match.recommendation}</p></section></article>)}</div><div className={styles.fact}><LockKeyhole/><p><b>지원자료에 있는 사실만 사용합니다.</b> 근거가 없는 역량은 문장으로 만들지 않고 확인 필요 상태로 남깁니다.</p></div></section>}

      {view === "interview" && <section className={styles.workspace}><div className={styles.title}><div><span className={styles.eyebrow}>INTERVIEW PREVIEW</span><h2>지원서에서 이어질 예상질문</h2></div><p>작성한 내용의 진위와 판단 과정을 확인할 가능성이 높은 질문입니다.</p></div>{result.interviewQuestions.length === 0 && <div className={styles.fact}><AlertCircle/><p><b>이번 분석에서는 면접 예상질문을 만들지 못했습니다.</b> 지원서에 실제로 적힌 내용에서만 질문을 뽑기 때문에, 문항을 보완한 뒤 다시 분석하면 근거와 답변 포인트까지 함께 제공합니다.</p></div>}<div className={styles.interviews}>{result.interviewQuestions.map((item,index) => <article key={item.id}><span>Q{index+1}</span><div><h3>{item.question}</h3><p>{item.reason}</p><section><b>답변에 포함할 내용</b>{item.answerGuide.map((guide) => <em key={guide}>{guide}</em>)}</section></div></article>)}</div>
        {/* Sold on the pricing table as PRO's 면접 리스크 분석. A risk is not another
            question: it names the sentence that will be pressed on and what to have ready. */}
        {result.interviewRisks.length > 0 && <section className={styles.risks}>
          <div><span className={styles.eyebrow}>INTERVIEW RISK</span><h3>면접에서 압박이 들어올 지점</h3><p>지원서에 실제로 적힌 문장 중 답변이 흔들릴 수 있는 곳과, 면접 전에 준비해 둘 것을 정리했습니다.</p></div>
          {result.interviewRisks.map((risk, index) => <article key={risk.id}>
            <header><span>{String(index + 1).padStart(2, "0")}</span><h4>{risk.topic}</h4></header>
            <p className={styles.riskBody}>{risk.risk}</p>
            <blockquote>&ldquo;{risk.evidenceQuote}&rdquo;</blockquote>
            <p className={styles.riskPrep}><b>면접 전 준비</b>{risk.preparation}</p>
          </article>)}
        </section>}
      </section>}

      {view === "final" && <section className={styles.final}><header><div><span className={styles.eyebrow}>제출용 최종 문장</span><h2>최종 첨삭본</h2><p>비교와 피드백을 제외하고 복사·제출할 답변만 모았습니다.</p></div><div><button onClick={() => copy("all",finalText)}>{copied === "all" ? <Check/> : <Clipboard/>}{copied === "all" ? "복사됨" : "전체 복사"}</button><button onClick={downloadDocx}><Download/> DOCX 저장</button><button onClick={download}><Download/> TXT 저장</button></div></header>{result.questions.map((question) => {const answer=answers[question.id]??question.revisedAnswer;const copyId=`final-${question.id}`;const answerLength=countCompactCharacters(answer);return <article key={question.id}><span>{String(question.order).padStart(2,"0")}</span><div><div className={styles.finalQuestionHead}><h3>{resolveQuestionTitle(question)}</h3><button onClick={() => copy(copyId,answer)}>{copied === copyId ? <Check/> : <Clipboard/>}{copied === copyId ? "복사됨" : "이 문항 복사"}</button></div>{question.subheading && <p className={styles.subheading}><b>소제목 제안</b>{question.subheading}</p>}<p>{answer}</p><small data-short={answerLength < question.targetLength * .7}>공백 제외 {answerLength} / {question.targetLength}자{answerLength < question.targetLength * .7 ? " · 분량 보완 필요" : ""}</small></div></article>})}{isFilledResult && <p className={styles.filledNotice}><AlertCircle/><span><b>비어 있던 부분을 채운 제안이 포함되어 있습니다.</b> 어디를 채웠는지는 <b>문항별 첨삭</b>에서 색으로 확인할 수 있습니다. 제출 전에 사실과 맞는지 확인해 주세요.</span></p>}<footer><CheckCircle2/><p><b>이 화면의 문장이 복붙용 최종 첨삭본입니다.</b> 문항별 첨삭에서 직접 고친 내용도 여기에 자동 반영됩니다.</p><span>DOCX는 한글(HWP)에서도 바로 열립니다 · PDF 내보내기 예정</span></footer></section>}
      {/* Sits before the next-step card because it acts on the draft in hand
          rather than moving to another stage. Only on the final tab, and only
          on a real result — there is nothing to revise on the sample. */}
      {view === "final" && !result.isSample && <section className={styles.revision}>
        <div>
          <span className={styles.eyebrow}>추가 요청</span>
          <h2>고치고 싶은 방향이 있나요?</h2>
          <p>지금 결과는 그대로 두고, 요청사항을 반영한 새 첨삭본을 받아 볼 수 있습니다. 문장 몇 개만 바꾸실 거라면 위에서 <b>직접 수정</b>하는 편이 빠릅니다.</p>
        </div>
        <textarea
          rows={3}
          value={revisionRequest}
          onChange={(event) => setRevisionRequest(event.target.value)}
          placeholder="예: 에이텍 경력은 빼고 직업상담 관련 경력으로만 구성해 주세요."
          aria-label="재첨삭 요청사항"
        />
        <div className={styles.revisionFoot}>
          <small>새 분석이므로 PRO 1회 결제가 필요합니다. 지금 결과는 그대로 남아 있습니다.</small>
          <button type="button" disabled={!revisionRequest.trim()} onClick={startRevision}>
            요청사항 반영해 다시 첨삭받기 <ArrowRight/>
          </button>
        </div>
      </section>}

      {/* The result screen ended here, with nothing indicating the product had
          a next stage. The stages have a real order and the applicant is the
          only one who cannot see it — so this names what the next one would do
          with the draft they now have, and renders nothing when there is
          honestly nothing left to suggest. */}
      {nextStep && <section className={styles.nextStep}>
        <div>
          <span className={styles.eyebrow}>선택 사항</span>
          <h2>{nextStep.label}</h2>
          <p><b>{nextStep.reassurance}</b> {nextStep.reason}</p>
        </div>
        <button type="button" onClick={() => carryDraftForward(nextStep.href, { writingMode: nextStep.writingMode, product: nextStep.product })}>
          지금 글 그대로 이어서 하기 <ArrowRight/>
        </button>
      </section>}
      {view === "final" && <ApplicationTrackerCard caseId={result.caseId} company={subject.name} role={subject.qualifier ?? applicationLabel} isSample={result.isSample} onPrepareInterview={() => setView("interview")} onReviewIssues={() => setView("overview")} />}
      {view === "final" && <FinalUpgradeCard product={result.product} />}
    </div>
  </main>;
}
