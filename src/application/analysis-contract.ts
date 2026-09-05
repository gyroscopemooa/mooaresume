import { z } from "zod";
import type { ResultDocument } from "@/domain/result-document";
import { writingStyleSchema } from "@/domain/writing-style";
import { editingStanceSchema } from "@/domain/editing-stance";

export const analysisDocumentInputSchema = z.object({
  // `certificate`는 증빙 서류입니다 — 자격증·면허증·졸업증명서. 예전에는
  // `portfolio`라는 이름으로 모델에 갔고, 작품집으로 소개된 증빙은 근거로
  // 쓰이지 않았습니다.
  kind: z.enum(["cover_letter", "job_posting", "resume", "career_description", "portfolio", "revision_request", "certificate", "applicant_note"]),
  text: z.string().min(1),
  // PostgreSQL represents an absent original_filename as null. Normalize it
  // at the external boundary so a pasted text document can be analyzed just
  // like an uploaded document without leaking nullable values downstream.
  filename: z.preprocess((value) => value ?? undefined, z.string().optional()),
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
  product: z.enum(["QUICK", "PRO", "FINAL"]),
  writingMode: z.enum(["CREATE", "BUILD", "POLISH"]),
  writingStyle: writingStyleSchema,
  // Optional so every caller written before the stance existed still validates;
  // absent means the default, which is what those runs already behaved like.
  editingStance: editingStanceSchema.optional(),
  targetLength: z.number().int().min(100).max(3000),
  // A posting can list several positions. Saying which one the applicant is
  // going for is the difference between matching their requirements and
  // matching all four positions at once.
  companyName: z.string().max(120).optional(),
  roleName: z.string().max(120).optional(),
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