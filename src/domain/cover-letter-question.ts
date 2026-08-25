import { z } from "zod";

export const coverLetterQuestionSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(120),
  prompt: z.string().max(1000),
  targetLength: z.number().int().min(100).max(3000).nullable(),
  answer: z.string().max(30_000),
});
export type CoverLetterQuestion = z.infer<typeof coverLetterQuestionSchema>;

export function createCoverLetterQuestion(answer = "", index = 0): CoverLetterQuestion {
  return { id: crypto.randomUUID(), title: "", prompt: "", targetLength: null, answer, ...(index === 0 ? {} : {}) };
}

/**
 * How far over the target an answer may run before the screen says something.
 *
 * A draft longer than its limit is normal — trimming to fit is half of what
 * editing is. What is not normal is 8,000 characters against a 700 target: the
 * analysis has no choice but to hand back a summary, and 90% of what the
 * applicant wrote disappears from the paid result with nothing on screen having
 * warned them. That case is almost never a long answer; it is several questions
 * that were never split apart, usually out of an uploaded file.
 */
const OVER_LENGTH_RATIO = 1.6;

export function countAnswerCharacters(answer: string): number {
  return answer.replace(/\s/g, "").length;
}

/**
 * Null when the answer is a reasonable length for its target, otherwise the
 * sentence to show under the box.
 */
export function describeOverLongAnswer(question: Pick<CoverLetterQuestion, "answer" | "targetLength">): string | null {
  const target = question.targetLength;
  if (!target) return null;
  const length = countAnswerCharacters(question.answer);
  if (length <= target * OVER_LENGTH_RATIO) return null;

  const times = Math.round((length / target) * 10) / 10;
  return `이 답변은 목표의 약 ${times}배(${length.toLocaleString()}자 / ${target.toLocaleString()}자)입니다. 이대로 분석하면 대부분이 요약되어 사라집니다. 여러 문항이 한 칸에 들어가 있지는 않은지, 목표 글자 수가 맞는지 확인해 주세요.`;
}

/**
 * The one number the analysis request carries for the whole draft.
 *
 * Every entry screen hardcoded 700 here while the form beside it collected a
 * limit per question, so an applicant who typed 1,500 was analyzed against 700
 * and got back a result a thousand characters short of what the company asked
 * for. The fallback stays only for a draft that states no limit at all.
 */
export function resolveDraftTargetLength(
  questions: readonly CoverLetterQuestion[],
  fallback: number,
): number {
  const answered = questions.filter((question) => question.answer.trim() && question.targetLength);
  const stated = (answered.length > 0 ? answered : questions)
    .map((question) => question.targetLength)
    .filter((value): value is number => Boolean(value));
  if (stated.length === 0) return fallback;
  // The largest, not the first: this is only the ceiling a question falls back
  // to when it states none of its own, and cutting one short is the failure
  // being fixed here.
  return Math.max(...stated);
}

/** How a per-question limit rides inside the serialized draft. */
const TARGET_LENGTH_MARKER = /\s*\[(\d{3,4})자\]\s*$/;

/** Reads the marker back off a heading, returning the heading without it. */
export function readTargetLengthMarker(heading: string): { heading: string; targetLength: number | null } {
  const match = heading.match(TARGET_LENGTH_MARKER);
  if (!match) return { heading, targetLength: null };
  return { heading: heading.replace(TARGET_LENGTH_MARKER, "").trim(), targetLength: Number(match[1]) };
}

export function serializeQuestionAnswers(
  questions: readonly CoverLetterQuestion[],
  options: { includeEmptyAnswers?: boolean; includeTargetLength?: boolean } = {},
): string {
  const kept = questions.filter((question) => options.includeEmptyAnswers || question.answer.trim());

  // A lone question with no title and no prompt is the raw bulk draft, which
  // already carries whatever numbering the applicant typed. Adding a heading
  // here would prepend a second numbered line — the origin of the duplicated
  // "1. 문항 1" headers that made the server count a phantom extra question.
  const [only] = kept;
  if (kept.length === 1 && only && !only.title.trim() && !only.prompt.trim()) {
    return only.answer.trim();
  }

  return kept
    .map((question, index) => {
      const title = question.title.trim();
      const questionPrompt = question.prompt.trim();
      const heading = title || questionPrompt || `문항 ${index + 1}`;
      const prompt = title && questionPrompt && questionPrompt !== title ? `\n질문: ${questionPrompt}` : "";
      // Only when asked for, and only the plan asks. The draft is shown back
      // to the applicant on later screens, and a marker they never typed reads
      // as the product having edited their words.
      const target = options.includeTargetLength && question.targetLength ? ` [${question.targetLength}자]` : "";
      return `${index + 1}. ${heading}${target}${prompt}\n${question.answer.trim()}`;
    })
    .join("\n\n");
}
