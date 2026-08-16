import { z } from "zod";

export const applicationOutcomeSchema = z.enum([
  "NOT_APPLIED",
  "APPLIED",
  "SCREENING_REJECTED",
  "INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFERED",
  "HIRED",
  "WITHDRAWN",
  "NO_RESPONSE",
  "UNKNOWN",
]);

export const outcomeConfidenceSchema = z.enum([
  "SELF_REPORTED",
  "FOLLOWUP_CONFIRMED",
  "DOCUMENT_VERIFIED",
  "INCONSISTENT",
]);

export const outcomeStageSchema = z.enum([
  "SUBMISSION",
  "DOCUMENT",
  "INTERVIEW_1",
  "INTERVIEW_FINAL",
  "FINAL",
]);

export const outcomeResultSchema = z.enum([
  "PENDING",
  "PASS",
  "FAIL",
  "WITHDRAWN",
  "NOT_SUBMITTED",
  "NO_RESPONSE",
  "UNKNOWN",
]);

export const outcomeFeedbackSchema = z.object({
  caseId: z.string().min(1),
  outcome: applicationOutcomeSchema,
  confidence: outcomeConfidenceSchema,
  submittedApplication: z.boolean(),
  observedAt: z.string().datetime(),
  feedbackRound: z.number().int().min(1).max(3),
  incentiveGranted: z.boolean(),
  optionalComment: z.string().max(1000).optional(),
});

export const candidateSnapshotSchema = z.object({
  schemaVersion: z.literal("1.0"),
  caseId: z.string().min(1),
  educationLevel: z.enum(["HIGH_SCHOOL", "ASSOCIATE", "BACHELOR", "MASTER", "DOCTORATE", "OTHER"]).optional(),
  majorCategory: z.string().max(100).optional(),
  grade: z.object({
    value: z.number().nonnegative(),
    scale: z.number().positive(),
  }).optional(),
  languageScores: z.array(z.object({
    test: z.string().max(50),
    score: z.string().max(50),
    acquiredAt: z.string().date().optional(),
  })).max(20),
  totalCareerMonths: z.number().int().nonnegative().optional(),
  roleCategories: z.array(z.string().max(100)).max(20),
  certifications: z.array(z.string().max(100)).max(30),
  internationalExperience: z.array(z.object({
    type: z.string().max(100),
    durationMonths: z.number().int().nonnegative().optional(),
  })).max(20),
  capturedAt: z.string().datetime(),
});

const snapshotMetadataSchema = z.object({
  snapshotId: z.string().min(1),
  caseId: z.string().min(1),
  capturedAt: z.string().datetime(),
  schemaVersion: z.literal("1.0"),
});

export const jobSnapshotSchema = snapshotMetadataSchema.extend({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  recruitmentName: z.string().max(300).optional(),
  postingText: z.string().min(1),
  requirements: z.array(z.string().min(1)).max(100),
  preferences: z.array(z.string().min(1)).max(100),
});

export const applicationSnapshotSchema = snapshotMetadataSchema.extend({
  candidateSnapshotId: z.string().min(1),
  jobSnapshotId: z.string().min(1),
  originalAnswers: z.record(z.string(), z.string()),
  aiRevisedAnswers: z.record(z.string(), z.string()),
  usedExperienceIds: z.array(z.string().min(1)),
  analysisRunId: z.string().min(1),
  promptVersion: z.string().min(1),
  rubricVersion: z.string().min(1),
  outputSchemaVersion: z.string().min(1),
  modelSnapshot: z.string().min(1),
});

export const submissionSnapshotSchema = snapshotMetadataSchema.extend({
  applicationSnapshotId: z.string().min(1),
  submittedAnswers: z.record(z.string(), z.string()),
  submittedAt: z.string().datetime(),
  userConfirmed: z.literal(true),
});

export const stagedOutcomeSchema = z.object({
  outcomeId: z.string().min(1),
  caseId: z.string().min(1),
  submissionSnapshotId: z.string().min(1).optional(),
  stage: outcomeStageSchema,
  result: outcomeResultSchema,
  confidence: outcomeConfidenceSchema,
  reportedAt: z.string().datetime(),
});

export type OutcomeFeedback = z.infer<typeof outcomeFeedbackSchema>;
export type CandidateSnapshot = z.infer<typeof candidateSnapshotSchema>;
export type JobSnapshot = z.infer<typeof jobSnapshotSchema>;
export type ApplicationSnapshot = z.infer<typeof applicationSnapshotSchema>;
export type SubmissionSnapshot = z.infer<typeof submissionSnapshotSchema>;
export type StagedOutcome = z.infer<typeof stagedOutcomeSchema>;
