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

export function serializeQuestionAnswers(questions: readonly CoverLetterQuestion[]): string {
  return questions
    .filter((question) => question.answer.trim())
    .map((question, index) => {
      const heading = question.title.trim() || `문항 ${index + 1}`;
      const prompt = question.prompt.trim() ? `\n질문: ${question.prompt.trim()}` : "";
      return `${index + 1}. ${heading}${prompt}\n${question.answer.trim()}`;
    })
    .join("\n\n");
}
