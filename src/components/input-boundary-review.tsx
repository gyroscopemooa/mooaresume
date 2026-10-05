"use client";
import { useId, useState } from "react";
import { applyQuestionBoundaryReview, inspectQuestionBoundaries, type QuestionBoundaryReview } from "@/domain/cover-letter-parser";
import styles from "./input-boundary-review.module.css";

function ReviewRow({ issue, onConfirm }: { issue: QuestionBoundaryReview; onConfirm: (question: string, answer: string) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState(issue.question);
  const [answer, setAnswer] = useState(issue.answer);
  const valid = Boolean(question.trim() && answer.trim()) && question.length <= 1000 && answer.length <= 30_000;
  return <div className={styles.review}>
    <button className={styles.notice} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><span>{issue.number}번 문항의 질문·답변 구분을 확인해 주세요.</span><span>{open ? "접기" : "확인"}</span></button>
    {open && <div className={styles.fields} id={id}>
      <label htmlFor={`${id}-question`}>질문</label><textarea id={`${id}-question`} value={question} rows={2} maxLength={1000} onChange={event => setQuestion(event.target.value)}/>
      <label htmlFor={`${id}-answer`}>내 답변</label><textarea id={`${id}-answer`} value={answer} rows={3} maxLength={30_000} onChange={event => setAnswer(event.target.value)}/>
      <small>섞인 부분만 옮겨 주세요. 원본 파일은 바뀌지 않습니다.</small>
      {!valid && <small role="status">질문과 답변을 모두 입력해 주세요.</small>}
      <button type="button" disabled={!valid} onClick={() => onConfirm(question, answer)}>확인 완료</button>
    </div>}
  </div>;
}

export function InputBoundaryReview({ text, onChange }: { text: string; onChange: (text: string, index: number) => void }) {
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const fingerprint = (question: string, answer: string, number: string) => JSON.stringify([number, question.trim(), answer.trim()]);
  const issues = inspectQuestionBoundaries(text).filter(issue => !confirmed.includes(fingerprint(issue.question, issue.answer, issue.number)));
  if (!issues.length) return null;
  return <>{issues.map(issue => <ReviewRow key={fingerprint(issue.question, issue.answer, issue.number)} issue={issue} onConfirm={(question, answer) => {
    const next = applyQuestionBoundaryReview(text, issue, question, answer);
    // Acknowledgement applies only to this exact text, never to later edits.
    setConfirmed(current => [...current, fingerprint(question.replace(/\s*\n\s*/g, " "), answer, issue.number)]);
    onChange(next, issue.index);
  }}/>)}</>;
}
