import { describe, expect, it } from "vitest";
import { appendTrackerEvent, applicationTrackerSchema, canTransitionTracker } from "./application-tracker";

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
