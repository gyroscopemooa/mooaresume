import Link from "next/link";
import type { ResultDocument, ResultQuestion } from "@/domain/result-document";
import {
  CLAUDE_ANNOTATION_LABEL,
  buildClaudeAnnotationMirror,
  segmentsFromSpans,
  type ClaudeAnnotationCard,
  type ClaudeAnnotationSegment,
} from "@/domain/claude-annotation-mirror";
import { claudeAnnotationSampleDocument, type ClaudeSampleQuestion } from "@/fixtures/claude-annotation-sample";
import styles from "./result-workspace-claude.module.css";

function AnnotatedText({ segments }: { segments: ClaudeAnnotationSegment[] }) {
  return <p className={styles.text}>{segments.map((segment) => segment.type
    ? <mark key={segment.key} data-type={segment.type}>{segment.value}</mark>
    : <span key={segment.key}>{segment.value}</span>)}</p>;
}

function AnnotationCards({ cards }: { cards: ClaudeAnnotationCard[] }) {
  if (!cards.length) return <p className={styles.empty}>표시할 원문 피드백이 없습니다.</p>;
  return <>{cards.map((card) => <div className={styles.annotationCard} key={card.key} data-type={card.type}>
    <span>{CLAUDE_ANNOTATION_LABEL[card.type]}</span>
    <p className={styles.quote}>&ldquo;{card.phrase}&rdquo;</p>
    <p>{card.comment}</p>
  </div>)}</>;
}

function SampleQuestionCard({ question }: { question: ClaudeSampleQuestion }) {
  const segments = segmentsFromSpans(question.originalAnswer, question.annotations);
  const cards: ClaudeAnnotationCard[] = question.annotations.map((annotation) => ({ key: annotation.id, phrase: annotation.phrase, type: annotation.type, comment: annotation.comment }));
  return <article className={styles.question}>
    <header><div><span>문항 {question.order}</span><h2>{question.title}</h2></div><small>{question.prompt}</small></header>
    <div className={styles.compare}>
      <section className={styles.copy}><small>제출한 원문 · 원문 첨삭</small><AnnotatedText segments={segments}/></section>
      <aside className={styles.cards}><AnnotationCards cards={cards}/></aside>
    </div>
    <div className={styles.notes}>
      <section><b>수정 이유</b><ul>{question.revisionReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></section>
      {question.verificationNote && <section><b>확인 필요</b><p>{question.verificationNote}</p></section>}
    </div>
  </article>;
}

function LiveQuestionCard({ question }: { question: ResultQuestion }) {
  const { segments, cards } = buildClaudeAnnotationMirror(question.originalAnswer, question.revisedAnswer, question.highlightedPhrases);
  return <article className={styles.question}>
    <header><div><span>문항 {question.order}</span><h2>{question.title}</h2></div><small>{question.prompt}</small></header>
    <div className={styles.compare}>
      <section className={styles.copy}><small>제출한 원문 · 원문 첨삭</small><AnnotatedText segments={segments}/></section>
      <aside className={styles.cards}><AnnotationCards cards={cards}/></aside>
    </div>
    <div className={styles.notes}>
      <section><b>수정 이유</b><ul>{question.revisionReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></section>
      {question.verificationNote && <section><b>확인 필요</b><p>{question.verificationNote}</p></section>}
    </div>
  </article>;
}

export function ResultWorkspaceClaude({ result }: { result?: ResultDocument }) {
  const isDemo = !result;
  const header = isDemo
    ? { company: claudeAnnotationSampleDocument.company, role: claudeAnnotationSampleDocument.role, applicationLabel: claudeAnnotationSampleDocument.applicationLabel }
    : { company: result.company, role: result.role, applicationLabel: result.applicationLabel };

  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><span>M</span>MOOA Resume</Link>
      <em>CLAUDE MIRROR · 비교용{isDemo ? " · 샘플" : ""}</em>
    </header>
    <div className={styles.container}>
      <Link href="/result" className={styles.back}>← 현재 결과 화면으로</Link>
      <section className={styles.hero}>
        <div>
          <small>ORIGINAL SUBMISSION REVIEW</small>
          <h1>제출한 원문 위에서<br/><em>좋은 표현과 보완점을 확인합니다.</em></h1>
          <p>{header.company} · {header.role} · {header.applicationLabel}</p>
        </div>
        <aside className={styles.principle}>
          <b>Claude 버전의 기준</b>
          {isDemo
            ? <p>2026-08-20 `feature/original-annotations` 브랜치에서 실제로 동작하던 4단계(좋은 표현 · 삭제 추천 · 구체성 부족 · 수정 추천) 원문 첨삭을 그대로 재현한 샘플입니다.</p>
            : <p>이 결과는 4단계 판정 데이터를 저장하지 않아, 실제 첨삭에서 삭제된 표현과 이미 강조된 표현만 표시합니다. 전체 4단계 예시는 analysisRunId 없이 이 페이지에 접속하면 볼 수 있습니다.</p>}
        </aside>
      </section>
      <div className={styles.legend}>
        <span><i data-type="good"/>좋은 표현</span>
        <span><i data-type="delete"/>삭제 추천</span>
        <span><i data-type="vague"/>구체성 부족</span>
        <span><i data-type="revise"/>수정 추천</span>
      </div>
      {isDemo
        ? claudeAnnotationSampleDocument.questions.map((question) => <SampleQuestionCard key={question.id} question={question}/>)
        : result.questions.map((question) => <LiveQuestionCard key={question.id} question={question}/>)}
      <p className={styles.footer}>이 화면은 현재 결과를 덮어쓰지 않는 Claude 비교용 미러입니다. 원본 결과 데이터와 사용자가 직접 수정한 내용은 변경하지 않습니다.</p>
    </div>
  </main>;
}
