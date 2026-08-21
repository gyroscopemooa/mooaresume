"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import type { CoverLetterQuestion } from "@/domain/cover-letter-question";
import {
  applyGuidedAnswers,
  availableGuidedBlocks,
  buildGuidedSteps,
  createGuidedExperience,
  createGuidedQuestion,
  guidedBlockLabel,
  GUIDED_EXPERIENCE_CATEGORIES,
  MAX_GUIDED_EXPERIENCES,
  type GuidedCreateDraft,
  type GuidedExperience,
} from "@/domain/guided-create";
import styles from "./guided-create-form.module.css";

type Props = {
  draft: GuidedCreateDraft;
  onDraftChange: (draft: GuidedCreateDraft) => void;
  questions: CoverLetterQuestion[];
  onQuestionsChange: (questions: CoverLetterQuestion[]) => void;
};

/**
 * The "처음부터 작성" path, asked one question at a time. No model is called
 * here — every sentence in the result has to trace back to something the
 * applicant typed on this screen, so the facts are gathered before the single
 * analysis runs, not invented during it.
 */
export function GuidedCreateForm({ draft, onDraftChange, questions, onQuestionsChange }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useMemo(() => buildGuidedSteps(draft), [draft]);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;
  const blocks = useMemo(() => availableGuidedBlocks(draft), [draft]);

  function setText(path: "motivation" | "aspiration" | "strength" | "goal", value: string) {
    onDraftChange({ ...draft, [path]: value });
  }

  function setExperience(index: number, field: keyof GuidedExperience, value: string) {
    const experiences = draft.experiences.length > 0 ? draft.experiences : [createGuidedExperience()];
    onDraftChange({
      ...draft,
      experiences: experiences.map((experience, position) => position === index ? { ...experience, [field]: value } : experience),
    });
  }

  // Adding one appends four more steps, so move straight into the first of them.
  function addExperience() {
    if (draft.experiences.length >= MAX_GUIDED_EXPERIENCES) return;
    onDraftChange({ ...draft, experiences: [...draft.experiences, createGuidedExperience()] });
    setStepIndex(stepIndex + 1);
  }

  // An assignment decides what a question's source text says, so the shared
  // question list is rewritten in the same step the draft changes.
  function toggleAssignment(questionId: string, block: string) {
    const current = draft.assignments[questionId] ?? [];
    const next = current.includes(block) ? current.filter((item) => item !== block) : [...current, block];
    const nextDraft = { ...draft, assignments: { ...draft.assignments, [questionId]: next } };
    onDraftChange(nextDraft);
    onQuestionsChange(applyGuidedAnswers(nextDraft, questions));
  }

  const stepFilled = step.id === "questions"
    ? questions.some((question) => question.prompt.trim().length > 0)
    : step.fields.length === 0
    ? questions.some((question) => (draft.assignments[question.id] ?? []).length > 0)
    : step.fields.some((field) => field.kind === "text"
      ? draft[field.path].trim().length > 0
      : (draft.experiences[field.index]?.[field.field] ?? "").trim().length > 0);

  return <section className={styles.guided}>
    <header>
      <div>
        <span className={styles.eyebrow}>처음부터 작성 · {stepIndex + 1} / {steps.length}</span>
        <h3>{step.title}</h3>
        <p>{step.help}</p>
      </div>
      {step.optional && <em className={styles.optional}>건너뛸 수 있어요</em>}
    </header>

    <div className={styles.progress} role="presentation">
      {steps.map((item, index) => <i key={item.id} data-done={index < stepIndex} data-current={index === stepIndex} />)}
    </div>

    {step.id === "assign" ? (
      <div className={styles.assign}>
        {questions.length === 0 && <p className={styles.empty}>아래에서 자기소개서 문항을 먼저 추가해 주세요.</p>}
        {questions.map((question, index) => {
          const assigned = draft.assignments[question.id] ?? [];
          return <article key={question.id}>
            <header><span>문항 {index + 1}</span><b>{question.prompt.trim() || "질문 없음"}</b></header>
            <div className={styles.chips}>
              {blocks.length === 0 && <small>앞 단계에서 내용을 입력하면 여기에 소재가 나타납니다.</small>}
              {blocks.map((block) => <button
                key={block}
                type="button"
                data-on={assigned.includes(block)}
                onClick={() => toggleAssignment(question.id, block)}
              >{assigned.includes(block) && <Check />}{guidedBlockLabel(block)}</button>)}
            </div>
          </article>;
        })}
      </div>
    ) : (
      <div className={styles.fields}>
        {step.experienceIndex !== undefined && step.fields[0]?.kind === "experience" && step.fields[0].field === "where" && <div className={styles.categories}>
          <span>어떤 종류의 경험인가요?</span>
          <div>{GUIDED_EXPERIENCE_CATEGORIES.map((category) => {
            const current = draft.experiences[step.experienceIndex!]?.category ?? "";
            return <button
              key={category}
              type="button"
              data-on={current === category}
              onClick={() => setExperience(step.experienceIndex!, "category", current === category ? "" : category)}
            >{category}</button>;
          })}</div>
        </div>}
        {step.fields.map((field) => <label key={field.label}>
          <span>{field.label}</span>
          <textarea
            rows={field.rows}
            placeholder={field.placeholder}
            value={field.kind === "text" ? draft[field.path] : draft.experiences[field.index]?.[field.field] ?? ""}
            onChange={(event) => field.kind === "text"
              ? setText(field.path, event.target.value)
              : setExperience(field.index, field.field, event.target.value)}
          />
        </label>)}
      </div>
    )}

    {step.offersAnotherExperience && <button type="button" className={styles.addExperience} onClick={addExperience}>
      <Plus /> 경험 하나 더 추가하기
      <small>문항마다 다른 경험을 쓰면 내용이 겹치지 않습니다</small>
    </button>}

    <footer>
      <button type="button" className={styles.back} disabled={stepIndex === 0} onClick={() => setStepIndex((current) => Math.max(0, current - 1))}>
        <ArrowLeft /> 이전
      </button>
      <span className={styles.status}>{stepFilled ? "입력됨" : step.optional ? "선택 항목" : "아직 비어 있어요"}</span>
      <button type="button" className={styles.next} disabled={isLast} onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}>
        다음 <ArrowRight />
      </button>
    </footer>

    {step.id === "questions" && <section className={styles.questions}>
      <div className={styles.questionsHead}>
        <div><span className={styles.eyebrow}>자기소개서 문항</span><h4>회사가 준 질문을 그대로 적어 주세요.</h4></div>
        <button type="button" onClick={() => onQuestionsChange([...questions, createGuidedQuestion()])}><Plus /> 문항 추가</button>
      </div>
      {questions.length === 0 && <p className={styles.empty}>아직 문항이 없습니다. 문항을 추가하면 문항별 초안을 만들 수 있어요.</p>}
      {questions.map((question, index) => <div key={question.id} className={styles.questionRow}>
        <span>{index + 1}</span>
        <input
          value={question.prompt}
          maxLength={1000}
          placeholder="예: 지원 동기와 입사 후 포부를 작성해 주세요."
          onChange={(event) => onQuestionsChange(questions.map((item) => item.id === question.id ? { ...item, prompt: event.target.value } : item))}
        />
        <button type="button" aria-label={`문항 ${index + 1} 삭제`} onClick={() => onQuestionsChange(questions.filter((item) => item.id !== question.id))}><Trash2 /></button>
      </div>)}
    </section>}

    <p className={styles.notice}>
      여기에 적은 사실만으로 초안을 만듭니다. 적지 않은 경험·자격·수치는 AI가 만들어 넣지 않고, 부족한 부분은 확인 질문으로 돌려드립니다.
    </p>
  </section>;
}
