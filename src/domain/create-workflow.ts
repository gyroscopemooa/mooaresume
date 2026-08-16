import { z } from "zod";

export const createStages = [
  "JOB_ANALYSIS",
  "EXPERIENCE_DISCOVERY",
  "EXPERIENCE_SELECTION",
  "FOLLOW_UP",
  "OUTLINE",
  "DRAFT",
  "REVISION",
  "FINAL_REVIEW",
  "INTERVIEW_PREP",
] as const;

export const createStageSchema = z.enum(createStages);
export type CreateStage = z.infer<typeof createStageSchema>;

export const candidateFactSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  source: z.enum(["resume", "career_document", "user_answer", "experience_bank"]),
  verificationStatus: z.enum(["verified_by_source", "confirmed_by_user", "needs_verification"]),
});

export const experienceCandidateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  matchedCompetencies: z.array(z.string().min(1)),
  sourceFactIds: z.array(z.string().min(1)).min(1),
});

export const createWorkflowStateSchema = z.object({
  applicationCaseId: z.string().min(1),
  stage: createStageSchema,
  jobPostingText: z.string(),
  rawAdditionalInfo: z.string().max(12000),
  candidateFacts: z.array(candidateFactSchema),
  experienceCandidates: z.array(experienceCandidateSchema),
  selectedExperienceIds: z.array(z.string()),
  followUpAnswers: z.record(z.string(), z.string()),
  approvedFactSummary: z.string().nullable(),
  outline: z.string().nullable(),
  currentDraft: z.string().nullable(),
  revisionCount: z.number().int().min(0),
});
export type CreateWorkflowState = z.infer<typeof createWorkflowStateSchema>;

export const initialCreateWorkflowState = (applicationCaseId: string): CreateWorkflowState => ({
  applicationCaseId,
  stage: "JOB_ANALYSIS",
  rawAdditionalInfo: "",
  jobPostingText: "",
  candidateFacts: [],
  experienceCandidates: [],
  selectedExperienceIds: [],
  followUpAnswers: {},
  approvedFactSummary: null,
  outline: null,
  currentDraft: null,
  revisionCount: 0,
});

export function canAdvanceCreateStage(state: CreateWorkflowState): boolean {
  switch (state.stage) {
    case "JOB_ANALYSIS": return state.jobPostingText.trim().length > 0;
    case "EXPERIENCE_DISCOVERY": return state.candidateFacts.length > 0;
    case "EXPERIENCE_SELECTION": return state.selectedExperienceIds.length > 0;
    case "FOLLOW_UP": return state.approvedFactSummary !== null;
    case "OUTLINE": return state.outline !== null;
    case "DRAFT": return state.currentDraft !== null;
    case "REVISION": return state.currentDraft !== null;
    case "FINAL_REVIEW": return state.currentDraft !== null;
    case "INTERVIEW_PREP": return false;
  }
}

export function advanceCreateStage(state: CreateWorkflowState): CreateWorkflowState {
  if (!canAdvanceCreateStage(state)) return state;
  const currentIndex = createStages.indexOf(state.stage);
  return { ...state, stage: createStages[Math.min(currentIndex + 1, createStages.length - 1)] };
}
