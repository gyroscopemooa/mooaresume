import { z } from "zod";

export const resultAttachmentSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  extension: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  parseStatus: z.enum(["ready", "warning", "failed"]),
  parserLabel: z.string().min(1),
  sectionCount: z.number().int().nonnegative(),
  warning: z.string().optional(),
});

export const resultPrioritySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(["posting_fit", "evidence", "duplication", "clarity", "length", "verification"]),
  severity: z.enum(["high", "medium", "low"]),
});

export const resultQuestionSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  title: z.string().min(1),
  prompt: z.string().min(1),
  targetLength: z.number().int().positive(),
  originalAnswer: z.string().min(1),
  revisedAnswer: z.string().min(1),
  highlightedPhrases: z.array(z.string().min(1)),
  revisionReasons: z.array(z.string().min(1)).min(1),
  verificationNote: z.string().optional(),
});

export const requirementMatchSchema = z.object({
  id: z.string().min(1),
  requirement: z.string().min(1),
  status: z.enum(["matched", "partial", "missing"]),
  evidence: z.string().min(1),
  recommendation: z.string().min(1),
});

export const interviewQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  reason: z.string().min(1),
  answerGuide: z.array(z.string().min(1)).min(1),
  relatedQuestionId: z.string().optional(),
});

export const resultCandidateProfileSchema = z.object({
  snapshotLabel: z.string().min(1),
  items: z.array(z.object({
    id: z.string().min(1),
    category: z.enum(["education", "grade", "career", "certification", "language", "award", "international", "project", "skill", "other"]),
    label: z.string().min(1),
    value: z.string().min(1),
    detail: z.string().optional(),
    needsVerification: z.boolean(),
  })).max(100),
});

export const consultingAdviceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["add", "remove", "strengthen", "structure", "clarify"]),
  title: z.string().min(1),
  guidance: z.string().min(1),
  rationale: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
});

export const resultDocumentSchema = z.object({
  schemaVersion: z.literal("1.0"),
  caseId: z.string().min(1),
  product: z.enum(["QUICK", "PRO"]),
  isSample: z.boolean(),
  company: z.string().min(1),
  role: z.string().min(1),
  applicationLabel: z.string().min(1),
  analyzedAt: z.string().datetime(),
  analysisRun: z.object({
    provider: z.enum(["mock", "openai"]),
    responseId: z.string().min(1).nullable(),
    model: z.string().min(1),
    promptVersion: z.string().min(1),
    rubricVersion: z.string().min(1),
    schemaVersion: z.string().min(1),
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    totalTokens: z.number().int().nonnegative().nullable(),
  }),
  readiness: z.object({
    score: z.number().int().min(0).max(100),
    label: z.string().min(1),
    summary: z.string().min(1),
    reasons: z.array(z.string().min(1)).min(1),
  }),
  attachments: z.array(resultAttachmentSchema),
  candidateProfile: resultCandidateProfileSchema,
  priorities: z.array(resultPrioritySchema).min(1).max(3),
  questions: z.array(resultQuestionSchema).min(1),
  requirementMatches: z.array(requirementMatchSchema),
  verificationQuestions: z.array(z.string().min(1)),
  consultingAdvice: z.array(consultingAdviceSchema).max(8).default([]),
  interviewQuestions: z.array(interviewQuestionSchema),
});

export type ResultDocument = z.infer<typeof resultDocumentSchema>;
export type ResultQuestion = z.infer<typeof resultQuestionSchema>;
export type ResultCandidateProfile = z.infer<typeof resultCandidateProfileSchema>;

export function countCompactCharacters(value: string) {
  return value.replace(/\s/g, "").length;
}

export function buildFinalDocumentText(
  document: Pick<ResultDocument, "company" | "role" | "questions">,
  answers: Record<string, string>,
) {
  const heading = `${document.company} · ${document.role}\n`;
  const body = [...document.questions]
    .sort((left, right) => left.order - right.order)
    .map((question) => `${question.order}. ${question.title}\n${answers[question.id] ?? question.revisedAnswer}`)
    .join("\n\n");
  return `${heading}\n${body}`;
}
