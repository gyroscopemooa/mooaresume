"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from "lucide-react";
import { JobPostingInput } from "@/components/job-posting-input";
import { MaterialUpload } from "@/components/material-upload";
import { AdditionalInfoInput } from "@/components/additional-info-input";
import { GuidedStepBody, guidedStepFilled } from "@/components/guided-create-form";
import {
  buildGuidedSteps,
  createGuidedCreateDraft,
  createGuidedExperience,
  MAX_GUIDED_EXPERIENCES,
} from "@/domain/guided-create";
import { createCoverLetterQuestion, serializeQuestionAnswers } from "@/domain/cover-letter-question";
import { saveGuestDraft } from "@/lib/guest-draft";
import type { CandidateFreeformAttachment, CandidateMaterialAttachment } from "@/domain/candidate-material";
import type { WritingStyle } from "@/domain/writing-style";
import styles from "./pro-create-wizard.module.css";

const MATERIAL_KEY = "mooa:guest-candidate-materials:v1";

/**
 * The "처음부터 작성" path for someone with nothing written yet.
 *
 * The earlier version put the whole ten-step interview inside step 4 of 6, so
 * there were two progress bars disagreeing and two "다음" buttons with no way
 * to tell which one moved you. The interview steps are laid out in the same
 * sequence as the rest now, under one counter.
 *
 * It also asked for experiences twice — once as a free-text memo, then again as
 * structured questions. Someone who has never written a cover letter should not
 * be made to describe the same job twice before anything is produced.
 */
export function ProCreateWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [posting, setPosting] = useState("");
  const [postingUrl, setPostingUrl] = useState("");
  const [postingFilenames, setPostingFilenames] = useState<string[]>([]);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [freeformAttachments, setFreeformAttachments] = useState<CandidateFreeformAttachment[]>([]);
  const [materialAttachments, setMaterialAttachments] = useState<CandidateMaterialAttachment[]>([]);
  const [draft, setDraft] = useState(createGuidedCreateDraft);
  const [questions, setQuestions] = useState([createCoverLetterQuestion()]);
  const [writingStyle, setWritingStyle] = useState<WritingStyle>("BALANCED");

  const guidedSteps = useMemo(() => buildGuidedSteps(draft), [draft]);
  const intro = [
    { id: "posting", title: "지원할 공고가 있나요?", help: "있으면 더 맞춤으로 작성합니다. 아직 없다면 건너뛰어도 됩니다." },
    { id: "target", title: "희망 회사와 직무를 알려주세요.", help: "모르면 비워도 됩니다. 예: 고객응대, 사무보조, 생산관리" },
    { id: "materials", title: "가진 자료가 있으면 올려주세요.", help: "이력서도 자격증도 없어도 됩니다. 기억나는 걸 아래에 대충 적어두면 다음 질문이 쉬워집니다." },
  ];
  const total = intro.length + guidedSteps.length + 1;
  const current = Math.min(stepIndex, total - 1);
  const guidedIndex = current - intro.length;
  const guidedStep = guidedIndex >= 0 && guidedIndex < guidedSteps.length ? guidedSteps[guidedIndex] : null;
  const isReview = current === total - 1;
  const stage = guidedStep ? intro.length : isReview ? intro.length + 1 : current;

  const readyToFinish = questions.some((question) => question.answer.trim());
  const assignStepIndex = intro.length + guidedSteps.findIndex((step) => step.id === "assign");

  function addExperience() {
    if (draft.experiences.length >= MAX_GUIDED_EXPERIENCES) return;
    setDraft({ ...draft, experiences: [...draft.experiences, createGuidedExperience()] });
    setStepIndex(current + 1);
  }

  function finish() {
    if (!readyToFinish) return;
    saveGuestDraft({
      draftText: serializeQuestionAnswers(questions),
      questionDrafts: questions.map((question) => question.answer),
      questions,
      targetLength: 700,
      temporaryWritingMode: "CREATE",
      selectedProduct: "PRO",
      companyName: company.trim() || undefined,
      roleName: role.trim() || undefined,
      writingStyle,
    });
    sessionStorage.setItem("mooa:guest-job-posting:v1", posting);
    sessionStorage.setItem("mooa:guest-job-posting-source:v1", JSON.stringify({ url: postingUrl, text: posting, filenames: postingFilenames }));
    sessionStorage.setItem(MATERIAL_KEY, JSON.stringify({
      schemaVersion: "1.0",
      freeformNotes: notes,
      freeformAttachments,
      experiences: [],
      profileEntries: [],
      materialAttachments,
    }));
    router.push("/analysis/prepare");
  }

  const heading = guidedStep
    ? { title: guidedStep.title, help: guidedStep.help, optional: guidedStep.optional }
    : isReview
      ? { title: "작성 방향을 확인해 주세요.", help: "말투만 고르면 끝입니다.", optional: false }
      : { title: intro[current].title, help: intro[current].help, optional: current !== 0 };

  const filled = guidedStep
    ? guidedStepFilled(guidedStep, draft, questions)
    : isReview
      ? readyToFinish
      : current === 0
        ? Boolean(posting.trim() || postingUrl.trim() || postingFilenames.length)
        : current === 1
          ? Boolean(company.trim() || role.trim())
          : Boolean(materialAttachments.length || notes.trim() || freeformAttachments.length);

  return <main className={styles.page}>
    <header>
      <Link href="/" className={styles.brand}><span>M</span>MOOA <b>Resume</b></Link>
      <small>PRO · 처음부터 작성</small>
    </header>

    <div className={styles.layout}>
      <aside>
        <b>작성 진행</b>
        {intro.map((item, index) => (
          <button key={item.id} data-active={index === current} data-done={index < current} onClick={() => setStepIndex(index)}>
            <span>{index < current ? <Check /> : index + 1}</span>{item.title.replace(/[?.].*$/, "")}
          </button>
        ))}
        {/* The interview is many steps; listing every one would bury the shape
            of the flow, so the sidebar shows it as a single stage. */}
        <button data-active={guidedStep !== null} data-done={current > intro.length + guidedSteps.length - 1} onClick={() => setStepIndex(intro.length)}>
          <span>{current > intro.length + guidedSteps.length - 1 ? <Check /> : intro.length + 1}</span>
          경험과 문항
          {guidedStep && <em>{guidedIndex + 1}/{guidedSteps.length}</em>}
        </button>
        <button data-active={isReview} onClick={() => setStepIndex(total - 1)}>
          <span>{intro.length + 2}</span>작성 방향
        </button>
        <p>모르는 것은 건너뛰어도 됩니다. 초안에는 입력한 사실만 사용합니다.</p>
      </aside>

      <section>
        {/* "1 / 14" is a discouraging first thing to read when you came here
            because you could not start. The five stages are the real shape;
            the interview's own position is shown in the sidebar. */}
        <small>처음부터 작성 · {stage + 1}단계 / {intro.length + 2}단계{guidedStep && ` · 질문 ${guidedIndex + 1}/${guidedSteps.length}`}</small>
        <h1>{heading.title}</h1>
        <p>{heading.help}</p>

        {current === 0 && <JobPostingInput
          url={postingUrl}
          text={posting}
          filenames={postingFilenames}
          onUrlChange={setPostingUrl}
          onTextChange={setPosting}
          onFilenamesChange={setPostingFilenames}
        />}

        {current === 1 && <>
          <label>희망 회사<input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="예: 롯데테크" /></label>
          <label>희망 직무<input value={role} onChange={(event) => setRole(event.target.value)} placeholder="예: 안전관리자" /></label>
        </>}

        {/* Materials and the free memo are one step: they answer the same
            question — "what do you have?" — and splitting them made the flow
            ask about the same job twice. */}
        {current === 2 && <>
          <MaterialUpload attachments={materialAttachments} onChange={setMaterialAttachments} />
          <AdditionalInfoInput
            text={notes}
            attachments={freeformAttachments}
            onTextChange={setNotes}
            onAttachmentsChange={setFreeformAttachments}
          />
        </>}

        {/* Every help text here says "대충 적어도 괜찮습니다", which is kind but
            leaves out the part that decides the result: the draft is built from
            what is typed here and nothing else. Someone who writes three words
            per step and gets a thin draft was never told why. */}
        {guidedStep && guidedStep.fields.length > 0 && guidedStep.id !== "questions" && <p className={styles.hint}>
          문장으로 쓰지 않아도 됩니다. 떠오르는 단어만 나열해도 AI가 문장으로 만들어 줍니다.
          다만 <b>여기 적은 내용만</b> 초안에 들어가므로, 많이 적을수록 결과가 좋아집니다.
        </p>}

        {guidedStep?.id === "assign" && questions.length > draft.experiences.length && <p className={styles.hint}>
          문항이 {questions.length}개인데 경험은 {draft.experiences.length}개입니다.
          이대로도 되지만, 경험을 더 넣으면 문항마다 다른 이야기를 쓸 수 있습니다.
        </p>}

        {guidedStep && <GuidedStepBody
          step={guidedStep}
          draft={draft}
          onDraftChange={setDraft}
          questions={questions}
          onQuestionsChange={setQuestions}
          onAddExperience={addExperience}
        />}

        {isReview && <>
          <div className={styles.styles}>
            {(["CONCISE", "BALANCED", "STRENGTH_FOCUSED"] as WritingStyle[]).map((value) => (
              <button key={value} type="button" data-active={writingStyle === value} onClick={() => setWritingStyle(value)}>
                {value === "CONCISE" ? "담백하게" : value === "BALANCED" ? "균형 있게" : "강점 살리기"}
              </button>
            ))}
          </div>
          {/* Saying "go back and finish it" without a way back is where people
              get stuck at the last step. */}
          {!readyToFinish && <p className={styles.blocked}>
            아직 문항에 쓸 소재가 정해지지 않았습니다.
            <button type="button" onClick={() => setStepIndex(assignStepIndex)}>소재 고르러 가기 <ArrowRight /></button>
          </p>}
          <p className={styles.safe}><LockKeyhole /> 없는 경험·수치·성과는 만들지 않습니다.</p>
        </>}

        <footer>
          <button type="button" disabled={current === 0} onClick={() => setStepIndex(Math.max(0, current - 1))}>
            <ArrowLeft /> 이전
          </button>
          <span className={styles.status}>{filled ? "입력됨" : heading.optional ? "선택 항목" : "아직 비어 있어요"}</span>
          {isReview
            ? <button type="button" disabled={!readyToFinish} onClick={finish}>분석 범위 확인 <ArrowRight /></button>
            : <button type="button" onClick={() => setStepIndex(current + 1)}>다음 <ArrowRight /></button>}
        </footer>
      </section>
    </div>
  </main>;
}
