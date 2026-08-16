import { z } from "zod";
import { issueTagSchema, writingModeSchema } from "./writing-mode";

const exampleIssueSchema = z.object({
  tag: issueTagSchema,
  title: z.string().min(1),
  reason: z.string().min(1),
  evidence: z.string().min(1),
  nextAction: z.string().min(1),
});

export const productExampleSchema = z.object({
  id: z.string().min(1),
  mode: writingModeSchema,
  tier: z.enum(["QUICK", "PRO"]),
  title: z.string().min(1),
  context: z.string().min(1),
  isSample: z.literal(true),
  readiness: z.number().int().min(0).max(100).nullable(),
  issues: z.array(exampleIssueSchema).min(1).max(3),
  before: z.string(),
  after: z.string(),
  changeReason: z.string().min(1),
  verificationQuestions: z.array(z.string().min(1)),
  interviewQuestions: z.array(z.string().min(1)).max(3),
});
export type ProductExample = z.infer<typeof productExampleSchema>;
