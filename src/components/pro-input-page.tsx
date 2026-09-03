"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, FileCheck2, FilePenLine, ListOrdered, LockKeyhole, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { clearGuestDraft, loadGuestDraft, saveGuestDraft } from "@/lib/guest-draft";
import { JobPostingInput } from "@/components/job-posting-input";
import { ResumeIntake, type ResumeAttachment } from "@/components/resume-intake";
import { AdditionalInfoInput } from "@/components/additional-info-input";
import { MaterialUpload } from "@/components/material-upload";
import { GuidedCreateForm } from "@/components/guided-create-form";
import { createGuidedCreateDraft, type GuidedCreateDraft } from "@/domain/guided-create";
import { isLinkOnlyPosting } from "@/domain/job-posting-source";
import { createCoverLetterQuestion, resolveDraftTargetLength, serializeQuestionAnswers, type CoverLetterQuestion } from "@/domain/cover-letter-question";
import { splitCoverLetterDraft } from "@/domain/cover-letter-parser";
import {
  candidateMaterialDraftSchema,
  createCandidateExperience,
  createCandidateProfileEntry,
  type CandidateExperienceInput,
  type CandidateFreeformAttachment,
  type CandidateMaterialAttachment,
  type CandidateProfileEntry,
  type ExperienceCategory,
  type ProfileEntryCategory,
} from "@/domain/candidate-material";
import { writingStyleConfig, type WritingStyle } from "@/domain/writing-style";
import { editingStanceConfig, type EditingStance } from "@/domain/editing-stance";
import { SimpleIntake, type SimpleIntakeFile } from "./simple-intake";
import { PRO_INCLUDED_LIMIT_CHARS } from "@/domain/usage-entitlement";
import { DEFAULT_TARGET_LENGTH, describeLengthLoss, describeResolvedLengths, describeSimpleIntakeGap, describeSimpleIntakeGaps, mapSimpleIntake, planQuestionLengths } from "@/domain/simple-intake-mapping";
import styles from "./pro-input-page.module.css";
import actionStyles from "./blocked-action.module.css";

// `product` decides which tier the saved draft is for. It defaults to PRO
// because every route that existed before FINAL is a PRO route, and a default
// keeps those pages untouched.
type Props = { mode: "CREATE" | "BUILD" | "POLISH"; product?: "PRO" | "FINAL" };

const modeContent = {
  CREATE: {
    label: "처음부터 작성 · PRO",
    title: "경험 후보를 찾고 사실을 확인한 뒤 초안을 만듭니다.",
    description: "공고와 지원자료, 자유롭게 적은 경험을 먼저 구조화하고 문항별 추천 소재와 꼭 필요한 질문을 거쳐 작성합니다.",
    cta: "경험 탐색 범위 확인",
    steps: [
      ["01", "경험 후보 정리", "지원자료와 자유입력에서 사용 가능한 사실을 찾습니다."],
      ["02", "문항별 소재 추천", "공고 요구와 문항 의도에 맞는 경험을 배치합니다."],
      ["03", "사실 2~4개 확인", "초안에 꼭 필요한 정보만 짧게 질문합니다."],
      ["04", "확인 후 초안 작성", "사용자가 확인한 사실만 사용해 초안과 검수본을 만듭니다."],
    ],
  },
  BUILD: {
    label: "내용 보완 · PRO",
    title: "현재 초안에서 부족한 경험과 근거를 채웁니다.",
    description: "작성한 문장을 보존하면서 공고와 지원자료에서 더 적합한 근거를 찾고, 꼭 필요한 정보만 추가로 확인합니다.",
    cta: "보완 작업 범위 확인",
    steps: [
      ["01", "부족한 근거 탐색", "공고 요구와 현재 초안 사이의 빈칸을 찾습니다."],
      ["02", "사용 가능한 경험 추천", "이력서와 경력자료에서 보완할 소재를 제안합니다."],
      ["03", "필요한 사실만 질문", "결과·역할처럼 빠진 정보만 짧게 확인합니다."],
      ["04", "내용 강화 및 교차검수", "기존 초안을 발전시키고 문항 간 중복까지 확인합니다."],
    ],
  },
  POLISH: {
    label: "최종 첨삭 · PRO",
    title: "완성한 지원서를 공고와 함께 바로 최종 검수합니다.",
    description: "긴 경험 인터뷰 없이 자료를 교차검증하고, 사실과 말투를 보존하는 최소 수정 원칙으로 제출본을 만듭니다.",
    cta: "최종검수 범위 확인",
    steps: [
      ["01", "제출 조건 확인", "문항 충족, 글자 수, 맞춤법과 표현을 점검합니다."],
      ["02", "자료 교차검증", "공고·이력서·경력기술서와 충돌하는 내용을 찾습니다."],
      ["03", "최소 수정 첨삭", "좋은 문장은 유지하고 필요한 부분만 정확히 고칩니다."],
      ["04", "최종본과 면접 리스크", "제출본과 지원서에서 이어질 예상질문을 제공합니다."],
    ],
  },
} as const;

const materialStorageKey = "mooa:guest-candidate-materials:v1";
const experienceCategories: Array<[ExperienceCategory, string]> = [
  ["CAREER_INTERNSHIP", "경력·인턴"], ["PART_TIME", "아르바이트"], ["PROJECT", "프로젝트"], ["SCHOOL_MAJOR", "학교·전공"],
  ["CLUB_STUDENT_COUNCIL", "동아리·학생회"], ["AWARD", "공모전·수상"], ["EDUCATION_BOOTCAMP", "교육·부트캠프"],
  ["INTERNATIONAL", "해외 경험"], ["VOLUNTEER", "봉사활동"], ["MILITARY", "군 복무"], ["PERSONAL_PROJECT", "개인·사이드 프로젝트"],
  ["FREELANCE", "프리랜서"], ["RESEARCH_PAPER", "연구·논문"],
  ["HOBBY", "취미에서 얻은 경험"], ["OTHER", "기타 경험"],
];
const categoryLabels = Object.fromEntries(experienceCategories) as Record<ExperienceCategory, string>;
const profileCategories: Array<[ProfileEntryCategory, string]> = [
  ["EDUCATION", "학력·전공"], ["GRADE", "학점"], ["CERTIFICATION", "자격증"], ["SKILL", "보유 기술"],
  ["LANGUAGE", "어학성적"], ["TRAINING", "교육·수료"], ["AWARD", "수상"], ["OTHER", "기타 스펙"],
];
const writingStyles: WritingStyle[] = ["CONCISE", "BALANCED", "STRENGTH_FOCUSED"];
// Ordered safest to riskiest so the row reads as one dial, not three options.
const editingStances: EditingStance[] = ["SAFE", "BALANCED", "CONVICTION"];
const profileCategoryLabels = Object.fromEntries(profileCategories) as Record<ProfileEntryCategory, string>;

export function ProInputPage({ mode, product = "PRO" }: Props) {
  const router = useRouter();
  const content = modeContent[mode];
  const Icon = mode === "POLISH" ? FileCheck2 : mode === "BUILD" ? FilePenLine : Sparkles;
  const [questions, setQuestions] = useState<CoverLetterQuestion[]>([createCoverLetterQuestion()]);
  const [posting, setPosting] = useState("");
  const [postingUrl, setPostingUrl] = useState("");
  const [postingFilenames, setPostingFilenames] = useState<string[]>([]);
  const [resumeFile, setResumeFile] = useState<ResumeAttachment | null>(null);
  const [resumeError, setResumeError] = useState("");
  // Set when the applicant arrived here from a finished result asking for a
  // re-run with materials attached. It is carried, shown, and saved again —
  // this page's save used to omit it, which silently dropped the instruction
  // on the way through.
  const [carriedRequest, setCarriedRequest] = useState("");
  const [showBlockedTip, setShowBlockedTip] = useState(false);
  const [experiences, setExperiences] = useState<CandidateExperienceInput[]>([]);
  const [profileEntries, setProfileEntries] = useState<CandidateProfileEntry[]>([]);
  const [freeformNotes, setFreeformNotes] = useState("");
  const [freeformAttachments, setFreeformAttachments] = useState<CandidateFreeformAttachment[]>([]);
  const [materialAttachments, setMaterialAttachments] = useState<CandidateMaterialAttachment[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [guidedDraft, setGuidedDraft] = useState<GuidedCreateDraft>(createGuidedCreateDraft);
  const [writingStyle, setWritingStyle] = useState<WritingStyle>("BALANCED");
  const [editingStance, setEditingStance] = useState<EditingStance>("BALANCED");
  const [resetKey, setResetKey] = useState(0);
  const [splitConfirmed, setSplitConfirmed] = useState(false);
  // 간편 by default. The detailed screen asks the applicant to file each
  // document into the right slot before it will do anything, which is work the
  // product should be doing — they already know what their files are.
  const [inputMode, setInputMode] = useState<"SIMPLE" | "DETAILED">("SIMPLE");
  const [simpleDraft, setSimpleDraft] = useState("");
  const [simpleFiles, setSimpleFiles] = useState<SimpleIntakeFile[]>([]);
  const [simpleError, setSimpleError] = useState("");
  // Prefilled rather than blank. An empty length let the target fall back to
  // the draft's own size: 8,000 pasted characters became an 8,000 character
  // goal, and a BUILD run then tried to fill it.
  const [simpleTargetLength, setSimpleTargetLength] = useState(String(DEFAULT_TARGET_LENGTH));
  const [gapPrompt, setGapPrompt] = useState(false);

  function resetDraft() {
    if (!window.confirm("입력한 지원서와 추가 자료를 모두 지우고 새로 시작할까요?")) return;
    clearGuestDraft();
    sessionStorage.removeItem("mooa:guest-job-posting:v1");
    sessionStorage.removeItem("mooa:guest-job-posting-source:v1");
    sessionStorage.removeItem(materialStorageKey);
    setQuestions([createCoverLetterQuestion()]);
    setPosting("");
    setPostingUrl("");
    setPostingFilenames([]);
    setResumeFile(null);
    setResumeError("");
    setExperiences([]);
    setProfileEntries([]);
    setFreeformNotes("");
    setFreeformAttachments([]);
    setMaterialAttachments([]);
    setCompanyName("");
    setRoleName("");
    setGuidedDraft(createGuidedCreateDraft());
    setWritingStyle("BALANCED");
    setSplitConfirmed(false);
    setSimpleDraft("");
    setSimpleFiles([]);
    setSimpleError("");
    setSimpleTargetLength(String(DEFAULT_TARGET_LENGTH));
    setResetKey((key) => key + 1);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const guest = loadGuestDraft();
      if (guest) { setQuestions(guest.questions ?? (guest.questionDrafts ?? [guest.draftText]).map((answer, index) => createCoverLetterQuestion(answer, index))); setWritingStyle(guest.writingStyle); setEditingStance(guest.editingStance ?? "BALANCED"); setCarriedRequest(guest.revisionRequest ?? ""); }
      try {
        const parsed = candidateMaterialDraftSchema.safeParse(JSON.parse(sessionStorage.getItem(materialStorageKey) ?? "null"));
        if (parsed.success) {
          setExperiences(parsed.data.experiences);
          setProfileEntries(parsed.data.profileEntries);
          setFreeformNotes(parsed.data.freeformNotes);
          setFreeformAttachments(parsed.data.freeformAttachments);
          setMaterialAttachments(parsed.data.materialAttachments);
        }
      } catch {
        sessionStorage.removeItem(materialStorageKey);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function continueFlow() {
    // The simple box saves exactly what the detailed screen saves. Everything
    // downstream — checkout, analysis, the server — keeps receiving the same
    // shape, so there is one pipeline to keep correct rather than two.
    const effective = inputMode === "SIMPLE"
      ? mapSimpleIntake(simpleDraft, simpleFiles, simpleTargetLengthValue)
      : {
          questions,
          posting,
          postingFilenames,
          materialAttachments,
          freeformAttachments,
          sourceFile: resumeFile,
          droppedFilenames: [] as string[],
        };
    const draftText = serializeQuestionAnswers(effective.questions);
    saveGuestDraft({
      draftText,
      questionDrafts: effective.questions.map((question) => question.answer),
      questions: effective.questions,
      // Derived from what the applicant typed per question; 700 is only the
      // floor for a draft that states no limit anywhere.
      targetLength: resolveDraftTargetLength(effective.questions, 700),
      temporaryWritingMode: mode,
      selectedProduct: product,
      companyName: companyName.trim() || undefined,
      roleName: roleName.trim() || undefined,
      writingStyle,
      editingStance,
      sourceFilename: effective.sourceFile?.filename,
      sourceFileExtension: effective.sourceFile?.extension,
      sourceFileSizeBytes: effective.sourceFile?.sizeBytes,
      revisionRequest: carriedRequest.trim() || undefined,
    });
    sessionStorage.setItem("mooa:guest-job-posting:v1", effective.posting);
    sessionStorage.setItem("mooa:guest-job-posting-source:v1", JSON.stringify({ url: inputMode === "SIMPLE" ? "" : postingUrl, text: effective.posting, filenames: effective.postingFilenames }));
    sessionStorage.setItem(materialStorageKey, JSON.stringify({ schemaVersion: "1.0", freeformNotes: inputMode === "SIMPLE" ? "" : freeformNotes, freeformAttachments: effective.freeformAttachments, experiences: inputMode === "SIMPLE" ? [] : experiences, profileEntries: inputMode === "SIMPLE" ? [] : profileEntries, materialAttachments: effective.materialAttachments }));
    router.push("/analysis/prepare");
  }

  function updateExperience(id: string, field: keyof CandidateExperienceInput, value: string) {
    setExperiences((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  function updateProfileEntry(id: string, field: keyof CandidateProfileEntry, value: string) {
    setProfileEntries((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  const hasPostingSource = Boolean(posting.trim() || postingUrl.trim() || postingFilenames.length);
  const linkOnlyPosting = isLinkOnlyPosting({ url: postingUrl, text: posting, filenames: postingFilenames });
  // Pasted in one piece with nothing to split on, the whole letter is analysed
  // as a single question — so there is no short question to lengthen and no
  // blank one to fill. Say so here rather than after the payment.
  const bulkAnswer = questions.length === 1 && !questions[0].title.trim() && !questions[0].prompt.trim()
    ? questions[0].answer
    : "";
  const unsplitDraft = Boolean(bulkAnswer.trim()) && splitCoverLetterDraft(bulkAnswer).length <= 1;
  // Blocking on this was a dead end. A letter that splits into one question is
  // sometimes exactly right — plenty of companies ask a single 자유기술 문항 —
  // and pressing 문항 구분 확인하기 could not clear the block, because the
  // splitter returned one question again. So the applicant was told to press a
  // button that changed nothing, forever.
  //
  // The notice stays; it only stops being a wall once they have actually seen
  // the split result and it really is one question.
  const blocksOnUnsplitDraft = unsplitDraft && !splitConfirmed;
  const hasCoverLetterAnswer = questions.some((question) => question.answer.trim());
  // Below 100 the saved question schema rejects it, and a typo of "50" should
  // not fail on save two screens later.
  const simpleTargetLengthValue = Number(simpleTargetLength) >= 100 ? Number(simpleTargetLength) : null;
  const simpleMapping = inputMode === "SIMPLE" ? mapSimpleIntake(simpleDraft, simpleFiles, simpleTargetLengthValue) : null;
  const simpleLengthPlans = simpleMapping ? planQuestionLengths(simpleMapping) : [];
  const simpleGaps = simpleMapping ? describeSimpleIntakeGaps(simpleMapping) : [];
  // 고르지 못한 자료가 남아 있으면 진행하지 않습니다.
  //
  // An UNSET file belongs to no bucket, so submitting one drops it from the
  // analysis without saying so — quieter than a wrong guess and worse. The
  // applicant is the only one who knows which it is, and it is one click.
  const unsetFileCount = simpleFiles.filter((file) => file.kind === "UNSET").length;
  const blockedReason = unsetFileCount > 0
    ? `자료 ${unsetFileCount}개의 종류를 골라 주세요. 파일 이름과 내용이 달라 저희가 고르지 못했습니다.`
    : simpleMapping
    ? describeSimpleIntakeGap(simpleMapping)
    : !hasPostingSource
    ? "채용공고 링크·내용·파일 중 하나를 먼저 넣어 주세요."
    // A warning was not enough. With one question the whole letter is analysed
    // as a single item: the per-question target falls back to a default, so a
    // long letter is measured against 700 characters, nothing can be filled
    // because there is no short question to find, and the per-question review
    // collapses into one block. One button press fixes all three.
    : blocksOnUnsplitDraft
      ? "자기소개서 문항 구분을 먼저 확인해 주세요. 문항이 나뉘어 있어야 문항별 글자 수를 맞추고, 부족한 문항을 채워 드릴 수 있습니다."
    : !hasCoverLetterAnswer
      ? mode === "CREATE"
        // Without this the run reached checkout and then failed on the server
        // for having no source document at all.
        ? "문항을 추가하고, 각 문항에 쓸 내용을 하나 이상 골라 주세요. 위 단계에서 입력한 내용이 문항별 초안의 재료가 됩니다."
        : "첨삭할 자기소개서 답변이 하나 이상 필요해요. 빈 문항은 그대로 두어도 됩니다."
      : "";

  return <main className={styles.page}>
    {gapPrompt && <div className={styles.gapOverlay} role="dialog" aria-modal="true" aria-labelledby="gap-prompt-title">
      <div className={styles.gapDialog}>
        <b id="gap-prompt-title">이대로 진행할까요?</b>
        <p>없는 자료만큼 빠지는 것이 있습니다. 나중에 자료를 더해 다시 분석하실 수 있습니다.</p>
        <ul>{simpleGaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
        <div>
          <button type="button" className={styles.gapCancel} onClick={() => setGapPrompt(false)}>자료 더 넣기</button>
          <button type="button" className={styles.gapGo} onClick={() => { setGapPrompt(false); continueFlow(); }}>이대로 진행 <ArrowRight/></button>
        </div>
      </div>
    </div>}

    <header><Link href="/" className={styles.brand}><span>M</span>MOOA <b>Resume</b></Link><span>PRO · 기업 지원서 1건 · 12,900원</span></header>
    <div className={styles.container}>
      <div className={styles.topRow}>
        <Link href="/onboarding" className={styles.back}><ArrowLeft/> 이전으로</Link>
        {mode === "CREATE" && (posting.trim() || postingUrl.trim() || postingFilenames.length > 0 || resumeFile || questions.some((question) => question.answer.trim()) || experiences.length > 0 || profileEntries.length > 0 || freeformNotes.trim() || freeformAttachments.length > 0 || materialAttachments.length > 0) && <button type="button" className={styles.reset} onClick={resetDraft}><RotateCcw/> 새로 시작하기</button>}
      </div>
      <div className={styles.heading}><Icon/><div><small>{content.label}</small><h1>{content.title}</h1><p>{content.description}</p></div></div>

      <section className={styles.flow}>
        <div><small>이 유형의 진행 순서</small><h2>{mode === "CREATE" ? "경험을 찾고 확인한 뒤 쓰는 흐름" : mode === "BUILD" ? "부족한 내용을 찾아 채우는 흐름" : "작성본을 바로 검수하는 흐름"}</h2></div>
        <ol>{content.steps.map(([number,title,description]) => <li key={number}><span>{number}</span><div><b>{title}</b><p>{description}</p></div></li>)}</ol>
      </section>

      <section className={styles.form}>
        {/* Both panes stay mounted. Switching back and forth is a comparison,
            not a reset — losing what was typed on the way over would make the
            switch something nobody presses twice. Only the payload branches. */}
        <div className={styles.modeSwitch}>
          {/* A real left-right toggle rather than two buttons. Two buttons ask
              which one is currently on; a track with a knob shows it. */}
          <button
            type="button"
            role="switch"
            aria-checked={inputMode === "DETAILED"}
            aria-label="입력 방식: 간편 입력과 상세 입력"
            className={`${styles.modeTrack} ${inputMode === "DETAILED" ? styles.modeTrackRight : ""}`}
            onClick={() => setInputMode(inputMode === "SIMPLE" ? "DETAILED" : "SIMPLE")}
          >
            <span className={styles.modeKnob} aria-hidden="true"/>
            <span className={inputMode === "SIMPLE" ? styles.modeOn : ""}>간편 입력</span>
            <span className={inputMode === "DETAILED" ? styles.modeOn : ""}>상세 입력</span>
          </button>
          <small>입력 방식만 다르고 첨삭·분석 수준은 동일합니다. 간편 입력에서는 자료를 한 번에 넣으면 자동으로 분류합니다.</small>
        </div>

        {inputMode === "SIMPLE" && <>
          <SimpleIntake draft={simpleDraft} onDraftChange={setSimpleDraft} targetLength={simpleTargetLength} onTargetLengthChange={setSimpleTargetLength} resolvedLengths={simpleMapping ? describeResolvedLengths(simpleMapping) : ""} lengthPlans={simpleLengthPlans} lengthLoss={describeLengthLoss(simpleLengthPlans)} limitCharacters={PRO_INCLUDED_LIMIT_CHARS} files={simpleFiles} onFilesChange={setSimpleFiles} onError={setSimpleError}/>
          {simpleError && <p className={styles.inputError}>{simpleError}</p>}
          {simpleMapping && simpleMapping.droppedFilenames.length > 0 && <p className={styles.postingWarning}><b>자료가 너무 많아 일부는 빼고 진행합니다.</b> {simpleMapping.droppedFilenames.join(", ")} — 꼭 필요한 자료라면 다른 파일을 빼고 다시 넣어 주세요.</p>}

        </>}

        <div className={inputMode === "SIMPLE" ? styles.hiddenPane : undefined}>
        <JobPostingInput url={postingUrl} text={posting} filenames={postingFilenames} onUrlChange={setPostingUrl} onTextChange={setPosting} onFilenamesChange={setPostingFilenames}/>
        {linkOnlyPosting && <p className={styles.postingWarning}><b>링크만으로는 공고 내용을 읽을 수 없어요.</b> 이 서비스는 링크를 열지 않고 입력된 글자만 분석합니다. 지금 진행하면 공고 요구사항 대조는 제공되지 않습니다. 위 &lsquo;링크 내용 불러오기&rsquo;를 누르거나, 공고 상세 내용을 복사해 붙여넣어 주세요.</p>}
        <div className={styles.targetFields}>
          <label><span>지원 회사 <b>선택</b></span><input value={companyName} maxLength={120} onChange={(event) => setCompanyName(event.target.value)} placeholder="예: 롯데테크"/></label>
          <label><span>지원 직무 <b>선택</b></span><input value={roleName} maxLength={120} onChange={(event) => setRoleName(event.target.value)} placeholder="예: 안전관리자"/></label>
        </div>
        <p className={styles.targetHint}>공고 하나에 여러 직무가 있을 때 어느 직무 기준으로 볼지 알려주시면, 그 직무의 요구사항만 대조합니다. 비워두면 공고 전체를 기준으로 봅니다.</p>
        {mode === "CREATE" ? <>
          <Link href="/pro/create-wizard" className={styles.wizardLink}>
            <ListOrdered/>
            <span><b>단계별로 하나씩 안내받기</b><small>공고·자료·경험을 순서대로 물어봅니다. 처음이라면 이쪽이 편합니다.</small></span>
            <ArrowRight/>
          </Link>
          <GuidedCreateForm draft={guidedDraft} onDraftChange={setGuidedDraft} questions={questions} onQuestionsChange={setQuestions}/>
        </> : <div className={styles.questionSection}><ResumeIntake key={resetKey} questions={questions} onChange={setQuestions} attachment={resumeFile} onAttachmentChange={setResumeFile} onError={setResumeError} onSplitConfirmed={setSplitConfirmed} compact onReset={resetDraft} showReset={Boolean(posting.trim() || postingUrl.trim() || postingFilenames.length > 0 || resumeFile || questions.some((question) => question.answer.trim()) || experiences.length > 0 || profileEntries.length > 0 || freeformNotes.trim() || freeformAttachments.length > 0 || materialAttachments.length > 0)}/>{resumeError && <p className={styles.inputError}>{resumeError}</p>}{unsplitDraft && <p className={styles.postingWarning}>{splitConfirmed
        ? <><b>한 문항으로 진행합니다.</b> 문항이 하나뿐인 자기소개서라면 이대로 괜찮아요. 여러 문항을 붙여넣으셨다면 문항 사이에 <b>1. 지원 동기</b>처럼 번호와 제목을 넣어 주시면 나누어 정리합니다.</>
        : <><b>문항 구분이 아직 안 되어 있어요.</b> 위 &lsquo;문항 구분 확인하기&rsquo;를 누르면 질문과 답변을 나누어 정리합니다. 문항이 나뉘어야 회사가 요구한 문항별 글자 수를 맞추고, 부족한 문항을 채워 드릴 수 있습니다.</>}</p>}</div>}
        {carriedRequest.trim() && <section className={styles.carriedRequest}>
          <span>이어서 진행 중인 요청사항</span>
          <q>{carriedRequest.trim()}</q>
          <small>자료를 추가한 뒤 계속하시면 이 요청사항이 함께 반영됩니다.</small>
        </section>}
        <section className={styles.optionalMaterials}>
          <div className={styles.sectionTitle}><div><span>선택 지원자료 <b>선택</b></span><h3>가지고 있는 자료만 올려주세요. 없는 자료는 건너뛰어도 됩니다.</h3></div><small>종류별 여러 파일 · 최대 10개</small></div>
          <MaterialUpload attachments={materialAttachments} onChange={setMaterialAttachments}/>
        </section>
        <section className={styles.experienceSection}>
          <div className={styles.sectionTitle}><div><span>추가로 알려주고 싶은 경험·정보 <b>선택</b></span><h3>직접 적거나 가지고 있는 자료를 한 번에 첨부하세요.</h3></div><small>PDF · DOCX · TXT · MD</small></div>
          <AdditionalInfoInput text={freeformNotes} attachments={freeformAttachments} onTextChange={setFreeformNotes} onAttachmentsChange={setFreeformAttachments}/>
          <p className={styles.freeformHelp}>많이 알려주실수록 더 적합한 소재를 찾는 데 도움이 됩니다. 입력 내용은 바로 자기소개서에 쓰지 않고 경험 후보로 정리한 뒤, 필요한 사실만 다시 확인합니다.</p>
        </section>
        <details className={styles.structuredInputs}><summary><Plus/> 경험을 하나씩 자세히 추가하기 <span>선택</span></summary><div className={styles.structuredBody}>
        <section className={styles.experienceSection}>
          <div className={styles.sectionTitle}><div><span>자격·스펙 직접 추가 <b>선택</b></span><h3>이력서에서 빠진 자격, 기술, 어학이나 교육 정보를 간단히 추가할 수 있어요.</h3></div><small>증빙파일 필수 아님</small></div>
          <div className={styles.categoryGrid}>{profileCategories.map(([category, label]) => <button type="button" key={category} onClick={() => setProfileEntries((current) => [...current, createCandidateProfileEntry(category)])}><Plus/> {label}</button>)}</div>
          <div className={styles.experienceList}>{profileEntries.map((entry, index) => <article key={entry.id}>
            <header><div><span>{profileCategoryLabels[entry.category]}</span><b>자격·스펙 {index + 1}</b></div><button type="button" aria-label={`자격·스펙 ${index + 1} 삭제`} onClick={() => setProfileEntries((current) => current.filter((item) => item.id !== entry.id))}><Trash2/></button></header>
            <div className={styles.experienceGrid}>
              <label><span>명칭</span><input value={entry.name} onChange={(event) => updateProfileEntry(entry.id, "name", event.target.value)} placeholder="예: 산업안전기사"/></label>
              <label><span>점수·등급·상태</span><input value={entry.valueOrStatus} onChange={(event) => updateProfileEntry(entry.id, "valueOrStatus", event.target.value)} placeholder="예: 취득 · 필기 합격 · OPIc IH"/></label>
              <label><span>취득·수료 시기</span><input value={entry.date} onChange={(event) => updateProfileEntry(entry.id, "date", event.target.value)} placeholder="YYYY.MM · 예: 2026.05"/></label>
              <label><span>기관 <b>선택</b></span><input value={entry.institution} onChange={(event) => updateProfileEntry(entry.id, "institution", event.target.value)} placeholder="예: 한국산업인력공단"/></label>
              <label className={styles.full}><span>활용 경험이나 설명 <b>선택</b></span><textarea rows={3} value={entry.applicationNote} onChange={(event) => updateProfileEntry(entry.id, "applicationNote", event.target.value)} placeholder="취득만 적어도 괜찮아요. 실제로 활용한 경험이 있다면 함께 알려주세요. 예: 위험성평가 실습에서 관련 기준을 활용함"/></label>
            </div>
          </article>)}</div>
        </section>
        <section className={styles.experienceSection}>
          <div className={styles.sectionTitle}><div><span>서류에 없는 추가 경험 <b>선택</b></span><h3>이력서에 적지 않은 경험도 자소서의 좋은 소재가 될 수 있어요.</h3></div><small>최대 30개</small></div>
          <div className={styles.categoryGrid}>{experienceCategories.map(([category, label]) => <button type="button" key={category} onClick={() => setExperiences((current) => [...current, createCandidateExperience(category)])}><Plus/> {label}</button>)}</div>
          {experiences.length === 0 && <p className={styles.emptyExperience}>해당되는 경험이 없다면 건너뛰어도 됩니다. 결제 후 AI가 공고에 필요한 정보만 다시 확인해요.</p>}
          <div className={styles.experienceList}>{experiences.map((experience, index) => <article key={experience.id}>
            <header><div><span>{categoryLabels[experience.category]}</span><b>추가 경험 {index + 1}</b></div><button type="button" aria-label={`추가 경험 ${index + 1} 삭제`} onClick={() => setExperiences((current) => current.filter((item) => item.id !== experience.id))}><Trash2/></button></header>
            <div className={styles.experienceGrid}>
              <label><span>경험 이름</span><input value={experience.title} onChange={(event) => updateExperience(experience.id, "title", event.target.value)} placeholder="예: 편의점 야간 아르바이트"/></label>
              <label><span>기간</span><input value={experience.period} onChange={(event) => updateExperience(experience.id, "period", event.target.value)} placeholder="예: 2023.03 ~ 2023.11"/></label>
              <label className={styles.full}><span>이 경험을 한 줄로 알려주세요 <b>이것만 적어도 가능</b></span><textarea rows={3} value={experience.summary} onChange={(event) => updateExperience(experience.id, "summary", event.target.value)} placeholder="예: 편의점에서 1년 동안 재고와 시재를 확인하고 교대 인수인계를 했어요."/></label>
            </div>
            <details className={styles.experienceDetails}><summary>기억나는 내용을 더 알려주기 <span>모두 선택</span></summary><div className={styles.experienceGrid}>
              <label className={styles.full}><span>당시 상황 또는 맡은 일</span><textarea rows={3} value={experience.situation} onChange={(event) => updateExperience(experience.id, "situation", event.target.value)} placeholder="무엇을 맡았고 어떤 상황이었나요?"/></label>
              <label className={styles.full}><span>내가 직접 한 행동</span><textarea rows={3} value={experience.action} onChange={(event) => updateExperience(experience.id, "action", event.target.value)} placeholder="본인이 직접 판단하거나 실행한 일을 적어주세요."/></label>
              <label><span>결과 또는 변화·배운 점</span><textarea rows={3} value={experience.result} onChange={(event) => updateExperience(experience.id, "result", event.target.value)} placeholder="수치가 없어도 실제 변화나 배운 점이면 충분해요."/></label>
              <label><span>강조하고 싶은 점</span><textarea rows={3} value={experience.emphasis} onChange={(event) => updateExperience(experience.id, "emphasis", event.target.value)} placeholder="예: 업무 연속성, 정확성, 고객 대응"/></label>
            </div></details>
          </article>)}</div>
          {experiences.length > 0 && <div className={styles.bankNotice}><Check/><span><b>입력한 경험은 Experience Bank 후보로 정리됩니다.</b><small>공고와 연결 가능성이 높은 경험을 먼저 찾고, 부족한 사실만 AI가 추가로 질문해요.</small></span></div>}
        </section>
        </div></details>

        <div className={styles.included}><b>PRO 결과에 포함</b><span><Check/> 공고 요구역량</span><span><Check/> 경험 근거 매칭</span><span><Check/> 문항 간 중복·충돌</span><span><Check/> 문항별 Before/After</span><span><Check/> 최종본·면접 예상질문</span></div>
        {/* 간편 입력에서는 묻지 않습니다.
            간편 입력을 고른 사람은 "빨리 맡기고 싶다"고 말한 것입니다. 그 뒤에
            고르는 화면을 둘씩 세워 두면 간편이 아니게 되고, 실제로는 대부분
            기본값 그대로 지나칩니다 — 물어본 척만 하는 셈입니다.

            고르고 싶은 사람에게는 상세 입력이 있습니다. 그래서 여기서는
            그 길이 있다는 것만 한 줄로 알려 줍니다. */}
        {inputMode === "DETAILED" ? <>
        <section className={styles.styleSection}>
          <div className={styles.sectionTitle}><div><span>작성 스타일</span><h3>어떤 느낌으로 작성할까요?</h3></div><small>나중에 변경 가능</small></div>
          <div className={styles.styleGrid}>{writingStyles.map((style) => { const option = writingStyleConfig[style]; return <button type="button" key={style} className={writingStyle === style ? styles.styleSelected : ""} onClick={() => setWritingStyle(style)}>
            <span className={styles.styleRadio} aria-hidden="true"/>
            <b>{option.label}{style === "BALANCED" && <em>추천</em>}</b>
            <p>{option.description}</p>
          </button>; })}</div>
          <p className={styles.styleSafety}><LockKeyhole/> 어떤 스타일을 선택해도 없는 경험·역할·사건·성과·수치는 만들지 않습니다.</p>
          {mode === "POLISH" && writingStyle === "STRENGTH_FOCUSED" && <p className={styles.polishConstraint}>강점을 적극적으로 찾되, 최종 첨삭 단계에서는 기존 말투와 좋은 문장을 우선 보존합니다.</p>}
        </section>

        {/* A separate axis from 작성 스타일 above: that one is how it sounds,
            this one is how much it is willing to be marked down for. */}
        <section className={styles.styleSection}>
          <div className={styles.sectionTitle}><div><span>첨삭 방향</span><h3>둥글게 갈까요, 소신 있게 갈까요?</h3></div><small>PRO부터 선택 가능</small></div>
          <p className={styles.stanceIntro}>자기소개서에는 정답이 없습니다. 평가하는 것은 결국 사람이라, 같은 문장을 어떤 담당자는 좋아하고 어떤 담당자는 걸고 넘어집니다. 그래서 <b>정답을 맞히는 대신 방향을 고르시면 됩니다.</b></p>
          <div className={styles.styleGrid}>{editingStances.map((stance) => { const option = editingStanceConfig[stance]; return <button type="button" key={stance} className={editingStance === stance ? styles.styleSelected : ""} onClick={() => setEditingStance(stance)}>
            <span className={styles.styleRadio} aria-hidden="true"/>
            <b>{option.icon} {option.label}{stance === "BALANCED" && <em>추천</em>}</b>
            <p>{option.description}</p>
            <ul className={styles.stancePoints}>{option.points.map((point) => <li key={point}>{point}</li>)}</ul>
          </button>; })}</div>
          <p className={styles.styleSafety}><LockKeyhole/> 어떤 방향을 골라도 사실은 바뀌지 않습니다. 다듬는 것은 표현이고, 지원자가 실제로 한 일은 그대로 둡니다.</p>
        </section>
        </> : (
          <p className={styles.styleHint}>
            <LockKeyhole/>
            <span>
              <b>작성 스타일과 첨삭 방향은 기본값(균형)으로 진행합니다.</b>
              직접 고르고 싶으시면 위에서 <b>상세 입력</b>으로 바꿔 주세요.
            </span>
          </p>
        )}
        </div>
        <div className={styles.notice}><LockKeyhole/><span><b>아직 서버로 전송하지 않습니다.</b><small>다음 화면에서 범위를 확인한 뒤 로그인·결제 경계로 이동합니다.</small></span></div>
        {blockedReason && <p className={actionStyles.message}><b>아직 {content.cta}을 진행할 수 없어요.</b><br/>{blockedReason}</p>}
        <div className={actionStyles.wrap} onMouseEnter={() => blockedReason && setShowBlockedTip(true)} onMouseLeave={() => setShowBlockedTip(false)} onFocus={() => blockedReason && setShowBlockedTip(true)} onBlur={() => setShowBlockedTip(false)}>
          {blockedReason && showBlockedTip && <div role="tooltip" className={actionStyles.tooltip}>{blockedReason}</div>}
          <button className={styles.submit} aria-disabled={Boolean(blockedReason)} onClick={() => {
            if (blockedReason) { setShowBlockedTip(true); return; }
            // Asked at the moment of pressing, not printed above the button.
            // A notice sitting on the page while they are still filling it in is
            // read once and then becomes furniture; a question at the last step
            // is the only place it can still change what they do.
            if (simpleGaps.length > 0) { setGapPrompt(true); return; }
            continueFlow();
          }}>{content.cta} <ArrowRight/></button>
        </div>
      </section>
    </div>
  </main>;
}
