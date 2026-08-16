import { z } from "zod";

export const evidenceSchema = z.object({
  source: z.enum(["resume", "job_posting", "reference", "user_answer"]),
  quote: z.string().min(1),
});

export const issueSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  explanation: z.string().min(1),
  action: z.string().min(1),
  severity: z.enum(["high", "medium", "low"]),
  category: z.enum(["objective", "qualitative", "needs_verification"]),
  evidence: z.array(evidenceSchema),
});

export const analysisResultSchema = z.object({
  schemaVersion: z.literal("1.0"),
  overallReadiness: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  scores: z.object({
    questionFit: z.number().int().min(0).max(100),
    specificity: z.number().int().min(0).max(100),
    logic: z.number().int().min(0).max(100),
    readability: z.number().int().min(0).max(100),
    persuasiveness: z.number().int().min(0).max(100),
    jobFit: z.number().int().min(0).max(100).optional(),
    postingFit: z.number().int().min(0).max(100).optional(),
  }),
  priorityIssues: z.array(issueSchema).min(1).max(3),
  strengths: z.array(z.string()),
  verificationQuestions: z.array(z.string()),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
