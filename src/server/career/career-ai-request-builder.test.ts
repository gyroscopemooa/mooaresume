import { describe, expect, it } from "vitest";
import { buildCareerInterpretationRequest } from "./career-ai-request-builder";
import type { LatestAssessment } from "./assessment-history";

const workStyle: LatestAssessment = {
  sessionId: "s1", assessmentCode: "work_style", assessmentVersion: "v1", completedAt: "2026-09-01T00:00:00Z",
  scores: [
    { code: "extraversion", score: 55 }, { code: "agreeableness", score: 70 }, { code: "conscientiousness", score: 88 },
    { code: "emotionalStability", score: 48 }, { code: "openness", score: 76 },
  ],
};
const interest: LatestAssessment = {
  sessionId: "s2", assessmentCode: "interest", assessmentVersion: "v1", completedAt: "2026-09-01T00:00:00Z",
  scores: [
    { code: "realistic", score: 40 }, { code: "investigative", score: 86 }, { code: "artistic", score: 68 },
    { code: "social", score: 74 }, { code: "enterprising", score: 30 }, { code: "conventional", score: 50 },
  ],
};
const workValues: LatestAssessment = {
  sessionId: "s3", assessmentCode: "work_values", assessmentVersion: "v1", completedAt: "2026-09-01T00:00:00Z",
  scores: [
    { code: "achievement", score: 88 }, { code: "independence", score: 79 }, { code: "recognition", score: 60 },
    { code: "relationships", score: 55 }, { code: "support", score: 40 }, { code: "conditions", score: 73 },
  ],
};

describe("buildCareerInterpretationRequest", () => {
  it("builds only the requested single-scope score list, with labels and levels", () => {
    const request = buildCareerInterpretationRequest("work_style", [workStyle]);
    expect(request).not.toBeNull();
    expect(request?.workStyleScores).toHaveLength(5);
    expect(request?.interestScores).toBeUndefined();
    expect(request?.workValueScores).toBeUndefined();
    const conscientiousness = request?.workStyleScores?.find((score) => score.label === "계획·완수");
    expect(conscientiousness).toEqual({ label: "계획·완수", score: 88, level: "높음" });
  });

  it("returns null when the requested scope's assessment is missing", () => {
    expect(buildCareerInterpretationRequest("interest", [workStyle])).toBeNull();
  });

  it("requires all three assessments for combined scope", () => {
    expect(buildCareerInterpretationRequest("combined", [workStyle, interest])).toBeNull();
    const request = buildCareerInterpretationRequest("combined", [workStyle, interest, workValues]);
    expect(request?.workStyleScores).toHaveLength(5);
    expect(request?.interestScores).toHaveLength(6);
    expect(request?.workValueScores).toHaveLength(6);
  });

  it("computes level boundaries the same way the free work-style scorer does", () => {
    const request = buildCareerInterpretationRequest("work_style", [workStyle]);
    const stability = request?.workStyleScores?.find((score) => score.label === "정서적 안정");
    expect(stability).toEqual({ label: "정서적 안정", score: 48, level: "보통" });
  });
});
