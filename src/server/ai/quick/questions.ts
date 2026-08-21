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
export function getAnalysisQuestions(request: AnalysisRequest): AnalysisQuestion[] {
  return readQuestions(request)
    .filter((question) => question.answer.trim())
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
  return readQuestions(request).filter(
    (question) => !question.answer.trim() && (question.title.trim() || question.prompt.trim()),
  );
}
