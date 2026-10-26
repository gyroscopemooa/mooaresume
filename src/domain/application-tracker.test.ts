import { describe, expect, it } from "vitest";
import { appendTrackerEvent, applicationTrackerSchema, canTransitionTracker, outcomeFollowupStage } from "./application-tracker";

describe("application tracker integrity", () => {
  it("blocks an outcome before submission", () => {
    expect(canTransitionTracker("NOT_SUBMITTED", "DOCUMENT_PASS")).toBe(false);
  });

  it("preserves organic self-reported status history", () => {
    const tracker = applicationTrackerSchema.parse({
      schemaVersion: "1.0",
      caseId: "case-1",
      company: "현대자동차",
      role: "생산관리",
      currentStatus: "RESULT_PENDING",
      events: [],
    });
    const updated = appendTrackerEvent(tracker, "DOCUMENT_PASS", "2026-09-01T00:00:00.000Z");
    expect(updated.currentStatus).toBe("DOCUMENT_PASS");
    expect(updated.events[0]).toMatchObject({
      collectionMode: "ORGANIC",
      verification: "SELF_REPORTED",
    });
  });
});

describe("지원 결과 후속 확인", () => {
  const now = new Date("2026-10-27T00:00:00.000Z");

  it("제출 2주 전에는 재촉하지 않는다", () => {
    expect(outcomeFollowupStage("2026-10-20T00:00:00.000Z", now).stage).toBe("not_due");
  });

  it("2주와 4주 시점을 구분한다", () => {
    expect(outcomeFollowupStage("2026-10-13T00:00:00.000Z", now)).toEqual({ stage: "two_weeks", daysSinceSubmission: 14 });
    expect(outcomeFollowupStage("2026-09-29T00:00:00.000Z", now)).toEqual({ stage: "four_weeks", daysSinceSubmission: 28 });
  });
});
