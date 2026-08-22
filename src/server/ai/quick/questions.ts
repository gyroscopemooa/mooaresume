import type { AnalysisRequest } from "@/application/analysis-contract";
import { splitCoverLetterDraft } from "@/domain/cover-letter-parser";
import type { CoverLetterQuestion } from "@/domain/cover-letter-question";

export type AnalysisQuestion = CoverLetterQuestion & { order: number; targetLength: number };

function readQuestions(request: AnalysisRequest): CoverLetterQuestion[] {
  const source = request.documents.find((document) => document.kind === "cover_letter");
  if (request.questions) return request.questions;
  return source ? splitCoverLetterDraft(source.text) : [];
}

/**
 * The single source of truth for which questions an analysis run covers.
 *
 * Prompt building and result assembly MUST agree on this list *and* on the
 * numbering. The model is told "return revisions for questionOrder 1..N" and
 * the assembler looks revisions up by that same number, so any divergence
 * silently attaches the wrong revision to the wrong question.
 *
 * Unanswered questions are deliberately excluded: the revision contract is
 * "rewrite this answer" and there is no answer to rewrite yet. They are still
 * kept in the stored document so PRO BUILD can fill them later — see
 * getUnansweredQuestions.
 */
/**
 * A draft pasted as one block comes back as a single question with no title and
 * no prompt. There is no way to tell which question is short, and no per-question
 * target length to aim at, so filling is not offered for it — see
 * docs/build-mode-fill-in-decision.md §5.
 */
function hasSeparatedQuestions(request: AnalysisRequest) {
  const questions = readQuestions(request);
  if (questions.length > 1) return true;
  const [only] = questions;
  return Boolean(only && (only.title.trim() || only.prompt.trim()));
}

/**
 * PRO BUILD is the only mode that writes missing content. QUICK BUILD still
 * points out what is missing without filling it, because filling honestly needs
 * the supporting-material cross-check that only PRO collects.
 */
/**
 * Whether the run should write each answer up to its target length.
 *
 * CREATE writes every answer from scratch, so the length target applies to it
 * just as much as to BUILD — but the shared instruction told it not to pad,
 * and nothing told it to reach the length the company asked for. Blank
 * questions are a separate matter: BUILD fills them from the rest of the
 * letter, while a CREATE question with nothing assigned has no material at
 * all, so including it would only invite invention.
 */
export function expandsToTargetLength(request: AnalysisRequest) {
  return request.product === "PRO"
    && (request.writingMode === "BUILD" || request.writingMode === "CREATE")
    && hasSeparatedQuestions(request);
}

export function fillsBlankQuestions(request: AnalysisRequest) {
  return request.product === "PRO"
    && request.writingMode === "BUILD"
    && hasSeparatedQuestions(request);
}

export function getAnalysisQuestions(request: AnalysisRequest): AnalysisQuestion[] {
  // When BUILD is filling, a blank question is still a question to answer — it
  // just has no draft yet. Every consumer reads this one list, so including it
  // here keeps the prompt, the assembler and the validator numbered alike.
  const keep = fillsBlankQuestions(request)
    ? (question: CoverLetterQuestion) => Boolean(question.answer.trim() || question.title.trim() || question.prompt.trim())
    : (question: CoverLetterQuestion) => Boolean(question.answer.trim());

  return readQuestions(request)
    .filter(keep)
    .map((question, index) => ({
      ...question,
      order: index + 1,
      targetLength: question.targetLength ?? request.targetLength,
    }));
}

/**
 * Questions the applicant left blank but that carry a real prompt. These are
 * what "빈 문항까지 보완하려면 PRO · 내용 보완으로" refers to, and the result
 * has to tell the user they were not covered instead of quietly dropping them.
 */
export function getUnansweredQuestions(request: AnalysisRequest): CoverLetterQuestion[] {
  // Nothing is left uncovered when BUILD fills them, and saying "제외했습니다"
  // beside a written draft would contradict the result on screen.
  if (fillsBlankQuestions(request)) return [];

  return readQuestions(request).filter(
    (question) => !question.answer.trim() && (question.title.trim() || question.prompt.trim()),
  );
}
