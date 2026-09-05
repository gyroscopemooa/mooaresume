import type { AnalysisRequest } from "@/application/analysis-contract";
import { splitCoverLetterDraft } from "@/domain/cover-letter-parser";
import type { CoverLetterQuestion } from "@/domain/cover-letter-question";

// Documents beyond the cover letter and the posting. Lives here rather than in
// prompt.ts because getAnalysisQuestions also needs to know whether they exist
// — prompt.ts already imports from this file, and the reverse would cycle.
/**
 * 자기소개서와 공고 밖에서 모델이 읽는 자료. **여기 없는 종류는 프롬프트에
 * 아예 실리지 않습니다** — 요청에는 담겨 오지만 모델은 못 봅니다.
 *
 * `certificate`가 그렇게 빠져 있었습니다. DB와 요청은 자격·증명서를 제 이름으로
 * 부르도록 고쳤는데(20260903100100_certificate_evidence.sql) 이 목록은 같이
 * 고쳐지지 않아, 자격증을 올려도 모델은 한 글자도 보지 못했습니다.
 *
 * `applicant_note`가 맨 앞인 이유는 예산 때문입니다. 아래에서 앞에서부터
 * 30,000자를 나눠 쓰는데, 이 자료는 지원자가 **"서류에 없다"고 일부러 적은
 * 것**이라 잘리면 그 칸의 뜻 자체가 사라집니다. 길어야 4,000자라 앞에 두어도
 * 뒤가 굶지 않습니다.
 */
export const SUPPORTING_KINDS = ["applicant_note", "resume", "certificate", "career_description", "portfolio"] as const;

export function hasSupportingMaterials(request: AnalysisRequest) {
  return request.documents.some((document) => SUPPORTING_KINDS.includes(document.kind as (typeof SUPPORTING_KINDS)[number]));
}

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
 * The tier that may open the supporting materials.
 *
 * Every rule below asked `product === "PRO"` directly, which silently made
 * FINAL behave like QUICK the moment it was added — no length target, no
 * filling blank questions, no writing from the résumé. FINAL is PRO plus its
 * own cross-checks, never PRO minus anything, so the question is "may this run
 * use the materials", not "is this run PRO".
 */
export function hasProCapabilities(request: AnalysisRequest) {
  return request.product === "PRO" || request.product === "FINAL";
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
  return hasProCapabilities(request)
    && (request.writingMode === "BUILD" || request.writingMode === "CREATE")
    && hasSeparatedQuestions(request);
}

/**
 * POLISH reaching the target from the applicant's own words, and no further.
 *
 * Leaving a 409-character answer at 409 against a 700 limit meant paying for a
 * result that still carried the defect, with the only remedy being another
 * purchase. Elaborating what is already written — what was done, why, how it
 * was judged — adds no facts, so it stays inside what "polish" means.
 *
 * What it must NOT do is tier 2: pulling unused facts out of the résumé. That,
 * and filling blank questions, is what BUILD is for, and the boundary between
 * the two modes is which materials may be opened, not how long the answer ends
 * up.
 */
export function expandsFromOwnContent(request: AnalysisRequest) {
  return hasProCapabilities(request)
    && request.writingMode === "POLISH"
    && hasSeparatedQuestions(request);
}

export function fillsBlankQuestions(request: AnalysisRequest) {
  return hasProCapabilities(request)
    && request.writingMode === "BUILD"
    && hasSeparatedQuestions(request);
}

/**
 * CREATE with nothing typed into any question, but a résumé (or career
 * description, or portfolio) attached. The wizard's per-question interview is
 * for someone with no material at all; someone who already has a detailed
 * résumé should not have to retype it into memo fields the résumé already
 * answers. Gated on materials existing — a CREATE question with no memo and
 * no material really has nothing, and writing it would only invent.
 */
export function fillsQuestionsFromMaterials(request: AnalysisRequest) {
  return hasProCapabilities(request)
    && request.writingMode === "CREATE"
    && hasSeparatedQuestions(request)
    && hasSupportingMaterials(request);
}

export function getAnalysisQuestions(request: AnalysisRequest): AnalysisQuestion[] {
  // When BUILD is filling, a blank question is still a question to answer — it
  // just has no draft yet. Every consumer reads this one list, so including it
  // here keeps the prompt, the assembler and the validator numbered alike.
  const keep = fillsBlankQuestions(request) || fillsQuestionsFromMaterials(request)
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
  // Nothing is left uncovered when BUILD or materials-only CREATE fills them,
  // and saying "제외했습니다" beside a written draft would contradict the
  // result on screen.
  if (fillsBlankQuestions(request) || fillsQuestionsFromMaterials(request)) return [];

  return readQuestions(request).filter(
    (question) => !question.answer.trim() && (question.title.trim() || question.prompt.trim()),
  );
}
