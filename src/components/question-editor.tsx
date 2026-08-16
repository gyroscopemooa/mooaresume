"use client";

import { Plus, Trash2 } from "lucide-react";
import { createCoverLetterQuestion, type CoverLetterQuestion } from "@/domain/cover-letter-question";
import { countNonWhitespaceCharacters } from "@/domain/usage-entitlement";
import styles from "./question-editor.module.css";

type Props = {
  questions: CoverLetterQuestion[];
  onChange: (questions: CoverLetterQuestion[]) => void;
  compact?: boolean;
};

export function QuestionEditor({ questions, onChange, compact = false }: Props) {
  function update(id: string, field: keyof CoverLetterQuestion, value: string | number | null) {
    onChange(questions.map((question) => question.id === id ? { ...question, [field]: value } : question));
  }

  return <div className={styles.editor} data-compact={compact}>
    {questions.map((question, index) => <article key={question.id}>
      <header><div><span>문항 {index + 1}</span><b>{question.title.trim() || "제목 미입력"}</b></div>{questions.length > 1 && <button type="button" aria-label={`문항 ${index + 1} 삭제`} onClick={() => onChange(questions.filter((item) => item.id !== question.id))}><Trash2/></button>}</header>
      <div className={styles.meta}>
        <label><span>문항 제목 <small>선택</small></span><input value={question.title} onChange={(event) => update(question.id, "title", event.target.value)} placeholder="예: 지원동기"/></label>
        <label><span>글자 수 제한 <small>선택</small></span><input type="number" min="100" max="3000" value={question.targetLength ?? ""} placeholder="예: 700" onChange={(event) => update(question.id, "targetLength", event.target.value ? Number(event.target.value) : null)}/><small className={styles.hint}>회사에서 지정한 제한이 있을 때만 입력</small></label>
        <label className={styles.full}><span>실제 자기소개서 질문 <small>선택</small></span><input value={question.prompt} onChange={(event) => update(question.id, "prompt", event.target.value)} placeholder="예: 지원동기 및 입사 후 포부를 작성해 주세요."/></label>
      </div>
      <label className={styles.answer}><span>작성한 답변</span><textarea rows={compact ? 8 : 11} value={question.answer} onChange={(event) => update(question.id, "answer", event.target.value)} placeholder="이 문항에 작성한 답변을 붙여넣어 주세요."/><small>공백 제외 {countNonWhitespaceCharacters([question.answer]).toLocaleString()}자{question.targetLength ? ` / 제한 ${question.targetLength.toLocaleString()}자` : ""}</small></label>
    </article>)}
    <button type="button" className={styles.add} onClick={() => onChange([...questions, createCoverLetterQuestion("", questions.length)])}><Plus/> 빠진 문항 추가</button>
  </div>;
}
