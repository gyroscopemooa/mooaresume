import { z } from "zod";

export const applicationTrackerStatusSchema = z.enum([
  "NOT_SUBMITTED",
  "SUBMITTED",
  "RESULT_PENDING",
  "DOCUMENT_PASS",
  "DOCUMENT_FAIL",
  "INTERVIEW_1_PENDING",
  "INTERVIEW_1_PASS",
  "INTERVIEW_1_FAIL",
  "FINAL_INTERVIEW_PENDING",
  "FINAL_PASS",
  "FINAL_FAIL",
  "WITHDRAWN",
  "UNKNOWN",
]);

export const outcomeCollectionModeSchema = z.enum(["ORGANIC", "REWARDED"]);
export const outcomeVerificationSchema = z.enum(["SELF_REPORTED", "VERIFIED"]);

export const trackerEventSchema = z.object({
  id: z.string().min(1),
  status: applicationTrackerStatusSchema,
  occurredAt: z.string().datetime(),
  collectionMode: outcomeCollectionModeSchema,
  verification: outcomeVerificationSchema,
});

export const applicationTrackerSchema = z.object({
  schemaVersion: z.literal("1.0"),
  caseId: z.string().min(1),
  company: z.string().min(1),
  role: z.string().min(1),
  submissionSnapshotId: z.string().min(1).optional(),
  submittedAt: z.string().datetime().optional(),
  currentStatus: applicationTrackerStatusSchema,
  events: z.array(trackerEventSchema),
});

export type ApplicationTrackerStatus = z.infer<typeof applicationTrackerStatusSchema>;
export type ApplicationTracker = z.infer<typeof applicationTrackerSchema>;

export type OutcomeFollowup = { stage: "not_due" | "two_weeks" | "four_weeks"; daysSinceSubmission: number };

export function outcomeFollowupStage(submittedAt: string | undefined, now = new Date()): OutcomeFollowup {
  if (!submittedAt) return { stage: "not_due", daysSinceSubmission: 0 };
  const submitted = new Date(submittedAt);
  if (Number.isNaN(submitted.getTime())) return { stage: "not_due", daysSinceSubmission: 0 };
  const daysSinceSubmission = Math.max(0, Math.floor((now.getTime() - submitted.getTime()) / 86_400_000));
  if (daysSinceSubmission >= 28) return { stage: "four_weeks", daysSinceSubmission };
  if (daysSinceSubmission >= 14) return { stage: "two_weeks", daysSinceSubmission };
  return { stage: "not_due", daysSinceSubmission };
}

const allowedTransitions: Record<ApplicationTrackerStatus, ApplicationTrackerStatus[]> = {
  NOT_SUBMITTED: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["RESULT_PENDING", "WITHDRAWN"],
  RESULT_PENDING: ["DOCUMENT_PASS", "DOCUMENT_FAIL", "WITHDRAWN", "UNKNOWN"],
  DOCUMENT_PASS: ["INTERVIEW_1_PENDING", "WITHDRAWN"],
  DOCUMENT_FAIL: [],
  INTERVIEW_1_PENDING: ["INTERVIEW_1_PASS", "INTERVIEW_1_FAIL", "WITHDRAWN", "UNKNOWN"],
  INTERVIEW_1_PASS: ["FINAL_INTERVIEW_PENDING", "FINAL_PASS", "WITHDRAWN"],
  INTERVIEW_1_FAIL: [],
  FINAL_INTERVIEW_PENDING: ["FINAL_PASS", "FINAL_FAIL", "WITHDRAWN", "UNKNOWN"],
  FINAL_PASS: [],
  FINAL_FAIL: [],
  WITHDRAWN: [],
  UNKNOWN: ["RESULT_PENDING"],
};

export function canTransitionTracker(
  from: ApplicationTrackerStatus,
  to: ApplicationTrackerStatus,
) {
  return allowedTransitions[from].includes(to);
}

export function appendTrackerEvent(
  tracker: ApplicationTracker,
  status: ApplicationTrackerStatus,
  occurredAt = new Date().toISOString(),
): ApplicationTracker {
  if (!canTransitionTracker(tracker.currentStatus, status)) return tracker;
  return {
    ...tracker,
    currentStatus: status,
    events: [...tracker.events, {
      id: tracker.caseId + "-event-" + (tracker.events.length + 1),
      status,
      occurredAt,
      collectionMode: "ORGANIC",
      verification: "SELF_REPORTED",
    }],
  };
}
