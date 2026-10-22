import { z } from "zod";
import { resultRecommendationSchema } from "./result-document";

export const adminAnalysisPreviewAnswerSchema = z.object({
  questionOrder: z.number().int().positive(),
  revisedAnswer: z.string().trim().min(1).max(12_000),
  section: z.object({
    title: z.string().trim().min(1).max(120),
    originalAnswer: z.string().min(1).max(12_000),
    revisionReasons: z.array(z.string().trim().min(1)).min(1).max(10),
    verificationNote: z.string().max(2_000),
    disposition: z.enum(["improved", "alternative", "maintained"]).optional(),
    // 원문 옆에 보이는 다른 시각 추천안. 2026-10-22 이전 미리보기에는 없다.
    recommendations: z.array(resultRecommendationSchema).max(3).optional(),
  }).optional(),
});

export const adminAnalysisPreviewInputSchema = z.object({
  analysisRunId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  revisedAnswers: z.array(adminAnalysisPreviewAnswerSchema).min(1).max(20),
  notes: z.string().trim().max(4_000).default(""),
}).superRefine((value, context) => {
  const orders = value.revisedAnswers.map(answer => answer.questionOrder);
  if (new Set(orders).size !== orders.length) context.addIssue({ code: "custom", message: "DUPLICATE_QUESTION_ORDER" });
  if (value.revisedAnswers.some(answer => answer.section) && !value.revisedAnswers.every(answer => answer.section)) {
    context.addIssue({ code: "custom", message: "INCOMPLETE_SECTION_REVIEW" });
  }
  for (const answer of value.revisedAnswers) {
    if (answer.section && answer.section.disposition !== "maintained" && !compareSecondReviewAnswer(answer.section.originalAnswer, answer.revisedAnswer).changed) {
      context.addIssue({ code: "custom", message: "SECTION_REWRITE_UNCHANGED" });
    }
    if (answer.section?.disposition === "maintained" && compareSecondReviewAnswer(answer.section.originalAnswer, answer.revisedAnswer).changed) {
      context.addIssue({ code: "custom", message: "FALSE_MAINTAINED_ANSWER" });
    }
  }
});

export type AdminAnalysisPreviewInput = z.infer<typeof adminAnalysisPreviewInputSchema>;
export type AdminAnalysisPreview = AdminAnalysisPreviewInput & { id: string; createdAt: string; updatedAt: string };
export type AdminAnalysisPreviewSummary = Pick<AdminAnalysisPreview, "id" | "analysisRunId" | "title" | "createdAt">;

export type SecondReviewComparison = {
  changed: boolean;
  beforeLength: number;
  afterLength: number;
  reducedCharacters: number;
};

export function compareSecondReviewAnswer(before: string, after: string): SecondReviewComparison {
  const normalizedBefore = before.trim().replace(/\s+/g, " ");
  const normalizedAfter = after.trim().replace(/\s+/g, " ");
  return {
    changed: normalizedBefore !== normalizedAfter,
    beforeLength: before.trim().length,
    afterLength: after.trim().length,
    reducedCharacters: Math.max(0, before.trim().length - after.trim().length),
  };
}

export function latestAdminAnalysisPreviewSummaryByRun(items: AdminAnalysisPreviewSummary[]): Record<string, AdminAnalysisPreviewSummary> {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).reduce<Record<string, AdminAnalysisPreviewSummary>>((latest, item) => {
    if (!latest[item.analysisRunId]) latest[item.analysisRunId] = item;
    return latest;
  }, {});
}
