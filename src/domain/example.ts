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
  // Both shipped to PRO but never appeared in the samples, so the two features
  // the tier is sold on were invisible to anyone deciding whether to buy it.
  // Optional with a default so the existing four fixtures stay valid as they
  // are and each one opts in.
  annotations: z.array(z.object({
    phrase: z.string().min(1),
    type: z.enum(["good", "delete", "vague", "revise", "fact"]),
    comment: z.string().min(1),
  })).max(4).default([]),
  interviewRisks: z.array(z.object({
    topic: z.string().min(1),
    risk: z.string().min(1),
    preparation: z.string().min(1),
  })).max(2).default([]),
});
export type ProductExample = z.infer<typeof productExampleSchema>;
