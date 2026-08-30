import { z } from "zod";

const scoreSchema = z.object({ label: z.string().min(1), score: z.number().int().min(0).max(100), level: z.enum(["높음", "보통", "낮음"]) });

export const careerInterpretationRequestSchema = z.object({
  schemaVersion: z.literal("1.0"),
  purpose: z.enum(["career_profile", "job_posting_comparison", "application_reflection"]),
  workStyleScores: z.array(scoreSchema).length(5).optional(),
  interestScores: z.array(scoreSchema).length(6).optional(),
  workValueScores: z.array(scoreSchema).length(6).optional(),
  resumeText: z.string().min(1).max(24_000).optional(),
  coverLetterText: z.string().min(1).max(24_000).optional(),
  jobPostingText: z.string().min(1).max(24_000).optional(),
}).refine((request) => request.workStyleScores || request.interestScores || request.workValueScores, { message: "최소 한 종류의 검사 결과가 필요합니다." });

const evidenceSchema = z.object({ source: z.enum(["work_style", "interest", "work_value", "resume", "cover_letter", "job_posting"]), quote: z.string().min(1).max(300) });
export const careerInterpretationOutputSchema = z.object({
  schemaVersion: z.literal("1.0"),
  profileSummary: z.string().min(1).max(280),
  workEnvironmentHypotheses: z.array(z.object({ title: z.string().min(1).max(80), description: z.string().min(1).max(360), evidence: z.array(evidenceSchema).min(1).max(3) })).max(4),
  experiencePrompts: z.array(z.string().min(1).max(240)).max(5),
  jobPostingQuestions: z.array(z.string().min(1).max(240)).max(5),
  limitations: z.array(z.string().min(1).max(240)).min(1).max(3),
});

export type CareerInterpretationRequest = z.infer<typeof careerInterpretationRequestSchema>;
export type CareerInterpretationOutput = z.infer<typeof careerInterpretationOutputSchema>;

const forbiddenClaims = [/합격\s*확률/, /취업\s*확률/, /당신에게\s*맞는\s*직업은/, /진단/, /장애/, /질환/];
export function validateCareerInterpretationOutput(output: CareerInterpretationOutput) {
  const text = [output.profileSummary, ...output.workEnvironmentHypotheses.flatMap((item) => [item.title, item.description]), ...output.experiencePrompts, ...output.jobPostingQuestions, ...output.limitations].join(" ");
  return forbiddenClaims.filter((pattern) => pattern.test(text)).map((pattern) => `금지된 결론 또는 표현: ${pattern}`);
}
