import { splitCoverLetterDraft } from "./cover-letter-parser";
import { applyDefaultTargetLength, createCoverLetterQuestion, type CoverLetterQuestion } from "./cover-letter-question";
import type { ClassifiedKind } from "./document-classify";

/**
 * Turns one box of mixed files into the shape the existing flow already saves.
 *
 * The point of 간편 입력 is that nothing downstream changes. The analysis, the
 * checkout and the server all keep receiving exactly what the detailed screen
 * sends them — the only difference is who sorted the documents. A second
 * pipeline for the simple path would be two things to keep correct and two
 * places for FINAL to be forgotten.
 */

export type SimpleIntakeSource = {
  filename: string;
  extension: string;
  sizeBytes: number;
  text: string;
  kind: ClassifiedKind;
};

export type SimpleAttachment = { filename: string; extension: string; sizeBytes: number; text: string };
export type SimpleMaterial = SimpleAttachment & { kind: "RESUME" | "CAREER_DOCUMENT" | "PORTFOLIO" | "CERTIFICATE" };

export type SimpleIntakeMapping = {
  questions: CoverLetterQuestion[];
  posting: string;
  postingFilenames: string[];
  materialAttachments: SimpleMaterial[];
  freeformAttachments: SimpleAttachment[];
  /** Set only when the letter came from a file rather than the box. */
  sourceFile: { filename: string; extension: string; sizeBytes: number } | null;
  /** Files the caps below left out, so the screen can say so instead of dropping them silently. */
  droppedFilenames: string[];
  /**
   * 첨삭 대상이 된 자기소개서 파일들. 붙여넣은 글이 이겼을 때는 비어 있습니다.
   *
   * 두 장 이상이면 화면이 막아야 하기 때문에 세어 둡니다. 이어 붙인 뒤 문항을
   * 나누면 "자기소개서"라고만 적힌 줄을 기준으로 그 앞이 통째로 버려져서, 어느
   * 쪽 문항이 살아남을지가 파일 안쪽 서식에 달리게 됩니다 — 남의 자소서를 함께
   * 올린 사람이 자기 문항 여섯 개를 잃고 남의 문항 세 개를 첨삭받는 일이 실제로
   * 있었습니다.
   */
  coverLetterFilenames: string[];
};

/**
 * The saved draft's own limits, mirrored here.
 *
 * `candidateMaterialDraftSchema` caps each attachment list at 10 and each text
 * at 50,000 characters. Exceeding them does not warn — it throws on save, after
 * the applicant has already filled the screen. Trimming here, and naming what
 * was trimmed, fails in the one place they can still do something about it.
 */
const MAX_ATTACHMENTS_PER_LIST = 10;
const MAX_ATTACHMENT_CHARACTERS = 50_000;

// 자격·증명서가 여기 있어야 근거 자료로 갑니다. 참고자료 쪽에 있으면 모델에는
// 가지만 예산에서 맨 뒤에 서고, 자료를 많이 넣을수록 먼저 잘립니다.
const MATERIAL_KINDS: ReadonlySet<ClassifiedKind> = new Set(["RESUME", "CAREER_DOCUMENT", "PORTFOLIO", "CERTIFICATE"]);

export function mapSimpleIntake(draft: string, files: readonly SimpleIntakeSource[], defaultTargetLength: number | null = null): SimpleIntakeMapping {
  const byKind = (kind: ClassifiedKind) => files.filter((file) => file.kind === kind);
  const dropped: string[] = [];

  const toAttachment = (file: SimpleIntakeSource): SimpleAttachment => ({
    filename: file.filename,
    extension: file.extension,
    sizeBytes: file.sizeBytes,
    text: file.text.slice(0, MAX_ATTACHMENT_CHARACTERS),
  });

  const capped = <T,>(list: readonly SimpleIntakeSource[], map: (file: SimpleIntakeSource) => T): T[] => {
    dropped.push(...list.slice(MAX_ATTACHMENTS_PER_LIST).map((file) => file.filename));
    return list.slice(0, MAX_ATTACHMENTS_PER_LIST).map(map);
  };

  const letterFiles = byKind("COVER_LETTER");
  // Typed text wins. Someone who pasted the letter and also attached an older
  // copy means the pasted one; taking the file instead would silently analyse
  // the wrong draft.
  const letterText = draft.trim() || letterFiles.map((file) => file.text).join("\n\n").trim();
  // A limit printed beside the question wins over the one box at the bottom:
  // the applicant typed one number for the whole form, the employer printed the
  // real one next to each question.
  const questions = applyDefaultTargetLength(
    letterText ? splitCoverLetterDraft(letterText) : [createCoverLetterQuestion()],
    defaultTargetLength,
  );

  const postingFiles = byKind("JOB_POSTING");

  const materials = capped(
    files.filter((file) => MATERIAL_KINDS.has(file.kind)),
    (file) => ({ ...toAttachment(file), kind: file.kind as SimpleMaterial["kind"] }),
  );
  const freeform = capped(byKind("OTHER"), toAttachment);

  return {
    questions,
    posting: postingFiles.map((file) => file.text).join("\n\n").trim(),
    postingFilenames: postingFiles.map((file) => file.filename),
    materialAttachments: materials,
    freeformAttachments: freeform,
    sourceFile: !draft.trim() && letterFiles[0]
      ? { filename: letterFiles[0].filename, extension: letterFiles[0].extension, sizeBytes: letterFiles[0].sizeBytes }
      : null,
    // 붙여넣은 글이 있으면 파일은 문항에 쓰이지 않았으므로 세지 않습니다.
    coverLetterFilenames: draft.trim() ? [] : letterFiles.map((file) => file.filename),
    droppedFilenames: dropped,
  };
}

/**
 * Why the simple screen cannot continue yet, or "" when it can.
 *
 * Says the missing thing rather than "필수 항목을 확인하세요": the applicant is
 * looking at one box and cannot tell which half of it is short.
 */
export function describeSimpleIntakeGap(mapping: SimpleIntakeMapping): string {
  const answered = mapping.questions.filter((question) => question.answer.trim());
  // 자기소개서가 두 장 이상이면 여기서 멈춥니다.
  //
  // 이어 붙여서 한 편으로 읽는 동안에는 어느 쪽이 살아남을지가 파일 안쪽 서식에
  // 달려 있었고, 버려진 쪽은 화면 어디에도 나타나지 않았습니다. 한 회사에 내는
  // 자기소개서는 한 편이므로, 조용히 하나를 고르는 대신 어느 것을 첨삭할지
  // 물어봅니다. 나머지는 분류를 참고자료로 바꾸거나 빼면 됩니다.
  if (mapping.coverLetterFilenames.length > 1) {
    return `자기소개서가 ${mapping.coverLetterFilenames.length}개입니다. 첨삭할 하나만 남기고, 나머지는 분류를 바꾸거나 빼 주세요. (${mapping.coverLetterFilenames.join(", ")})`;
  }
  if (answered.length === 0) return "자기소개서 내용을 붙여넣거나 자소서 파일을 넣어 주세요.";
  // The posting is no longer required. It was blocking people who have a draft
  // and no posting to hand — and refusing to run at all is worse for them than
  // running without the posting-to-experience comparison. What it costs is said
  // out loud instead, on the screen, before they continue.
  // Never let a run start with no length to write to.
  //
  // Without a stated limit the target fell back to whatever the draft happened
  // to be — 8,000 characters of pasted application form became an 8,000
  // character goal, and a PRO BUILD run then tried to *fill* it. The number is
  // prefilled with a safe default on screen, so reaching this sentence means
  // they deliberately cleared it.
  if (answered.some((question) => !question.targetLength)) {
    return "문항별 글자 수를 적어 주세요. 공고에 제한이 없다면 그대로 두셔도 됩니다.";
  }
  return "";
}

/**
 * The length used when neither the posting nor the applicant states one.
 *
 * A Korean cover-letter question is 500-1,000 characters; 700 sits in the
 * middle and is short enough that being wrong costs a trim rather than a
 * thousand characters of invented filler.
 */
export const DEFAULT_TARGET_LENGTH = 700;

/** What each answered question will actually be measured against. */
/**
 * What the run will not be able to do, given what is missing. Empty when
 * nothing is missing.
 *
 * A warning, not a block: they are told what they lose and continue if they
 * want to. Naming the specific loss is the difference between a notice someone
 * reads and one they click past.
 */
export function describeSimpleIntakeGaps(mapping: SimpleIntakeMapping): string[] {
  const gaps: string[] = [];
  if (!mapping.posting.trim() && mapping.postingFilenames.length === 0) {
    gaps.push("채용공고가 없어 요구 역량과 경험을 맞춰보는 대조는 빠집니다.");
  }
  if (mapping.materialAttachments.length === 0) {
    gaps.push("이력서·경력기술서가 없어 자기소개서에 적힌 내용의 근거 확인은 빠집니다.");
  }
  return gaps;
}

export function describeResolvedLengths(mapping: SimpleIntakeMapping): string {
  const lengths = mapping.questions
    .filter((question) => question.answer.trim())
    .map((question) => question.targetLength);
  if (lengths.length === 0 || lengths.some((length) => !length)) return "";
  const unique = Array.from(new Set(lengths));
  return unique.length === 1
    ? `모든 문항 ${unique[0]}자 기준으로 봅니다.`
    : `문항별로 ${lengths.join(" · ")}자 기준으로 봅니다.`;
}

/**
 * 문항마다 지금 몇 자이고 목표가 몇 자인지.
 *
 * The screen said "모든 문항 700자 기준으로 봅니다" and stopped there, which reads
 * as a setting rather than as a consequence. Someone who uploaded a finished
 * 자기소개서 and left the default got answers cut close to half without anything
 * on the screen having mentioned how long theirs already were.
 *
 * Trimming is a legitimate thing to ask for. Being unable to see that you asked
 * for it is not.
 */
export type QuestionLengthPlan = {
  label: string;
  current: number;
  target: number | null;
  /** 0.44 = 44% 줄어듦. 목표가 없거나 늘어나는 쪽이면 0. */
  shrink: number;
};

export function planQuestionLengths(mapping: SimpleIntakeMapping): QuestionLengthPlan[] {
  return mapping.questions
    .filter((question) => question.answer.trim())
    .map((question, index) => {
      // 공백을 빼고 셉니다. 지원서 양식이 세는 방식과 결과 화면이 세는 방식이
      // 같아야 숫자를 비교할 수 있습니다.
      const current = question.answer.replace(/\s/g, "").length;
      const target = question.targetLength;
      return {
        label: question.title.trim() || `문항 ${index + 1}`,
        current,
        target,
        shrink: target && current > target ? (current - target) / current : 0,
      };
    });
}

/** 원문이 눈에 띄게 줄어드는 문항만. 다듬는 정도는 첨삭이지 손실이 아닙니다. */
export function describeLengthLoss(plans: readonly QuestionLengthPlan[]): string | null {
  const shrinking = plans.filter((plan) => plan.shrink >= 0.25);
  if (shrinking.length === 0) return null;
  const worst = Math.round(Math.max(...shrinking.map((plan) => plan.shrink)) * 100);
  return `${shrinking.length}개 문항이 최대 ${worst}%까지 짧아집니다. 지금 분량을 지키고 싶으시면 글자 수를 올리거나, 문항마다 제목 뒤에 (1200자)처럼 적어 주세요.`;
}
