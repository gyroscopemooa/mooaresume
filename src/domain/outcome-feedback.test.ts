import { describe, expect, it } from "vitest";
import {
  applicationSnapshotSchema,
  candidateSnapshotSchema,
  outcomeFeedbackSchema,
  stagedOutcomeSchema,
  submissionSnapshotSchema,
} from "./outcome-feedback";

describe("application outcome feedback", () => {
  it("keeps outcome confidence separate from the reported result", () => {
    const result = outcomeFeedbackSchema.parse({
      caseId: "case-1",
      outcome: "SCREENING_REJECTED",
      confidence: "SELF_REPORTED",
      submittedApplication: true,
      observedAt: "2026-08-16T00:00:00.000Z",
      feedbackRound: 1,
      incentiveGranted: true,
    });
    expect(result.outcome).toBe("SCREENING_REJECTED");
    expect(result.confidence).toBe("SELF_REPORTED");
  });

  it("stores a structured snapshot without requiring the original file", () => {
    expect(candidateSnapshotSchema.safeParse({
      schemaVersion: "1.0",
      caseId: "case-1",
      educationLevel: "BACHELOR",
      majorCategory: "산업공학",
      grade: { value: 3.8, scale: 4.5 },
      languageScores: [{ test: "TOEIC", score: "850" }],
      totalCareerMonths: 0,
      roleCategories: ["생산관리"],
      certifications: [],
      internationalExperience: [],
      capturedAt: "2026-08-16T00:00:00.000Z",
    }).success).toBe(true);
  });

  it("does not confuse an AI revision with an actual submission", () => {
    const application = applicationSnapshotSchema.parse({
      snapshotId: "application-snapshot-1",
      schemaVersion: "1.0",
      caseId: "case-1",
      capturedAt: "2026-08-16T00:00:00.000Z",
      candidateSnapshotId: "candidate-snapshot-1",
      jobSnapshotId: "job-snapshot-1",
      originalAnswers: { q1: "원문" },
      aiRevisedAnswers: { q1: "AI 수정본" },
      usedExperienceIds: ["experience-1"],
      analysisRunId: "run-1",
      promptVersion: "prompt-v1",
      rubricVersion: "rubric-v1",
      outputSchemaVersion: "result-v1",
      modelSnapshot: "model-snapshot",
    });
    expect(application.aiRevisedAnswers.q1).toBe("AI 수정본");
    expect(submissionSnapshotSchema.safeParse({
      ...application,
      applicationSnapshotId: application.snapshotId,
      submittedAnswers: application.aiRevisedAnswers,
      submittedAt: "2026-08-16T01:00:00.000Z",
      userConfirmed: false,
    }).success).toBe(false);
  });

  it("connects a staged result to the confirmed submission", () => {
    expect(stagedOutcomeSchema.safeParse({
      outcomeId: "outcome-1",
      caseId: "case-1",
      submissionSnapshotId: "submission-1",
      stage: "DOCUMENT",
      result: "PASS",
      confidence: "SELF_REPORTED",
      reportedAt: "2026-09-01T00:00:00.000Z",
    }).success).toBe(true);
  });
});
