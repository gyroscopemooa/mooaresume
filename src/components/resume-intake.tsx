"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { Check, FileUp, ListChecks, PencilLine, Upload } from "lucide-react";
import { QuestionEditor } from "@/components/question-editor";
import { AttachmentCard } from "@/components/attachment-card";
import { splitCoverLetterDraft } from "@/domain/cover-letter-parser";
import { createCoverLetterQuestion, serializeQuestionAnswers, type CoverLetterQuestion } from "@/domain/cover-letter-question";
import { countNonWhitespaceCharacters } from "@/domain/usage-entitlement";
import styles from "./resume-intake.module.css";

export type ResumeAttachment = { filename: string; extension: string; sizeBytes: number };
type Props = { questions: CoverLetterQuestion[]; onChange: (questions: CoverLetterQuestion[]) => void; attachment?: ResumeAttachment | null; onAttachmentChange?: (attachment: ResumeAttachment | null) => void; compact?: boolean; onError?: (message: string) => void };

export function ResumeIntake({ questions, onChange, attachment, onAttachmentChange, compact, onError }: Props) {
  const [view, setView] = useState<"bulk" | "questions">(questions.length > 1 ? "questions" : "bulk");
  const [bulk, setBulk] = useState(() => questions.length > 1 ? serializeQuestionAnswers(questions) : questions[0]?.answer ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (questions.length > 1) setView("questions");
      if (!bulk && questions.some((question) => question.answer.trim())) {
        setBulk(questions.length > 1 ? serializeQuestionAnswers(questions) : questions[0]?.answer ?? "");
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [bulk, questions]);

  function updateBulk(value: string) {
    setBulk(value);
    const base = questions[0] ?? createCoverLetterQuestion();
    onChange([{ ...base, answer: value }]);
    onError?.("");
  }

  function confirmQuestions() {
    const parsed = splitCoverLetterDraft(bulk);
    onChange(parsed);
    setView("questions");
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setBusy(true); onError?.("");
    try {
      const { extractLocalDocument } = await import("@/lib/local-document");
      const extracted = await extractLocalDocument(selected);
      setBulk(extracted.text);
      onChange(splitCoverLetterDraft(extracted.text));
      onAttachmentChange?.({ filename: extracted.filename, extension: extracted.extension, sizeBytes: extracted.sizeBytes });
      setView("questions");
    } catch (reason) {
      onError?.(reason instanceof Error ? reason.message : "파일을 읽지 못했어요.");
    } finally { setBusy(false); event.target.value = ""; }
  }

  const total = countNonWhitespaceCharacters(questions.map((question) => question.answer));
  return <section className={styles.intake}>
    <div className={styles.head}><div><span>현재 자기소개서 <b>필수</b></span><h3>전체를 한 번에 붙여넣거나 파일 하나를 올려도 돼요.</h3></div><small>내부에서는 문항별로 정리</small></div>
    {attachment && <AttachmentCard {...attachment} onRemove={() => onAttachmentChange?.(null)}/>} 
    {view === "bulk" ? <>
      <div className={styles.tabs}><button type="button" className={styles.active}><PencilLine/> 전체 내용 붙여넣기</button><label><FileUp/> {busy ? "파일 확인 중" : "자소서 파일 업로드"}<input type="file" accept=".pdf,.docx,.txt,.md" onChange={handleFile} disabled={busy}/></label></div>
      <textarea rows={compact ? 10 : 14} value={bulk} onChange={(event) => updateBulk(event.target.value)} placeholder={'자기소개서 전체를 그대로 붙여넣어 주세요.\n\n1. 지원 동기\n작성한 답변...\n\n2. 직무 역량\n작성한 답변...'}/>
      <div className={styles.bulkFoot}><span>공백 제외 {countNonWhitespaceCharacters([bulk]).toLocaleString()}자</span><button type="button" disabled={!bulk.trim()} onClick={confirmQuestions}><ListChecks/> 문항 구분 확인하기</button></div>
      <p className={styles.help}>전체를 붙여넣은 뒤 문항 구분 확인하기를 누르면 질문·답변을 나누어 정리합니다. 회사의 문항별 글자 수 제한이 있다면 이 방식으로 진행하는 것을 추천해요.</p>
    </> : <>
      <div className={styles.found}><Check/><span><b>{questions.filter((question) => question.answer.trim()).length}개 문항을 확인했어요.</b><small>질문·답변과 회사의 글자 수 제한을 확인해 주세요.</small></span><button type="button" onClick={() => { setBulk(serializeQuestionAnswers(questions)); setView("bulk"); }}>전체로 다시 입력</button></div>
      <QuestionEditor questions={questions} onChange={onChange} compact={compact}/>
      {!attachment && <label className={styles.secondaryUpload}><Upload/> 파일로 교체 <input type="file" accept=".pdf,.docx,.txt,.md" onChange={handleFile} disabled={busy}/></label>}
    </>}
    <div className={styles.total}><span>지원서 전체 입력량</span><b>공백 제외 {total.toLocaleString()}자</b></div>
  </section>;
}
