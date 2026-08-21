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

export function serializeQuestionAnswers(
  questions: readonly CoverLetterQuestion[],
  options: { includeEmptyAnswers?: boolean } = {},
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
      return `${index + 1}. ${heading}${prompt}\n${question.answer.trim()}`;
    })
    .join("\n\n");
}
