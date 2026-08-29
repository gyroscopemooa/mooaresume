import { splitCoverLetterDraft } from "./cover-letter-parser";
import { createCoverLetterQuestion, type CoverLetterQuestion } from "./cover-letter-question";
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
export type SimpleMaterial = SimpleAttachment & { kind: "RESUME" | "CAREER_DOCUMENT" | "PORTFOLIO" };

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

const MATERIAL_KINDS: ReadonlySet<ClassifiedKind> = new Set(["RESUME", "CAREER_DOCUMENT", "PORTFOLIO"]);

export function mapSimpleIntake(draft: string, files: readonly SimpleIntakeSource[]): SimpleIntakeMapping {
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
  const questions = letterText ? splitCoverLetterDraft(letterText) : [createCoverLetterQuestion()];

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
  const hasLetter = mapping.questions.some((question) => question.answer.trim());
  if (!hasLetter) return "자기소개서 내용을 붙여넣거나 자소서 파일을 넣어 주세요.";
  if (!mapping.posting.trim() && mapping.postingFilenames.length === 0) {
    return "채용공고를 함께 넣어 주세요. 공고가 있어야 요구 역량과 경험을 맞춰볼 수 있습니다.";
  }
  return "";
}
