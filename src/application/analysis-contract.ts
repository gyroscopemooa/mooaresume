import { z } from "zod";
import type { ResultDocument } from "@/domain/result-document";
import { writingStyleSchema } from "@/domain/writing-style";

export const analysisDocumentInputSchema = z.object({
  kind: z.enum(["cover_letter", "job_posting", "resume", "career_description", "portfolio"]),
  text: z.string().min(1),
  filename: z.string().optional(),
});

export const analysisQuestionInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(120),
  prompt: z.string().max(1000),
  targetLength: z.number().int().min(100).max(3000).nullable(),
  answer: z.string().min(1).max(30_000),
});

export const analysisRequestSchema = z.object({
  requestId: z.string().min(1),
  product: z.enum(["QUICK", "PRO"]),
  writingMode: z.enum(["CREATE", "BUILD", "POLISH"]),
  writingStyle: writingStyleSchema,
  targetLength: z.number().int().min(100).max(3000),
  documents: z.array(analysisDocumentInputSchema).min(1),
  questions: z.array(analysisQuestionInputSchema).min(1).max(20).optional(),
});

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;

export interface ResumeAnalysisProvider {
  analyze(request: AnalysisRequest): Promise<ResultDocument>;
}

export function validateAnalysisRequest(input: unknown): AnalysisRequest {
  return analysisRequestSchema.parse(input);
}