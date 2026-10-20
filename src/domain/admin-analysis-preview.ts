import { z } from "zod";

export const adminAnalysisPreviewAnswerSchema = z.object({
  questionOrder: z.number().int().positive(),
  revisedAnswer: z.string().trim().min(1).max(12_000),
});

export const adminAnalysisPreviewInputSchema = z.object({
  analysisRunId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  revisedAnswers: z.array(adminAnalysisPreviewAnswerSchema).min(1).max(20),
  notes: z.string().trim().max(4_000).default(""),
}).superRefine((value, context) => {
  const orders = value.revisedAnswers.map(answer => answer.questionOrder);
  if (new Set(orders).size !== orders.length) context.addIssue({ code: "custom", message: "DUPLICATE_QUESTION_ORDER" });
});

export type AdminAnalysisPreviewInput = z.infer<typeof adminAnalysisPreviewInputSchema>;
export type AdminAnalysisPreview = AdminAnalysisPreviewInput & { id: string; createdAt: string; updatedAt: string };
export type AdminAnalysisPreviewSummary = Pick<AdminAnalysisPreview, "id" | "analysisRunId" | "title" | "createdAt">;

export function latestAdminAnalysisPreviewSummaryByRun(items: AdminAnalysisPreviewSummary[]): Record<string, AdminAnalysisPreviewSummary> {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).reduce<Record<string, AdminAnalysisPreviewSummary>>((latest, item) => {
    if (!latest[item.analysisRunId]) latest[item.analysisRunId] = item;
    return latest;
  }, {});
}
