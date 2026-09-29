import { describe, expect, it } from "vitest";
import { performanceObservationSchema, PERFORMANCE_RUBRIC } from "./interview-performance-rubric";

const observation = { criterion: "candidate_question", startSeconds: 10, endSeconds: 12, source: "transcript", outcome: "positive", observation: "지원자가 질문함", evidence: "초기 기대 역할은 무엇인가요?", context: "답변 종료 후 질문 기회 요청", coaching: "" };
describe("full-session rubric", () => {
  it("accepts a candidate-initiated question with evidence", () => expect(performanceObservationSchema.safeParse(observation).success).toBe(true));
  it("rejects unsupported judgments", () => expect(performanceObservationSchema.safeParse({ ...observation, evidence: " " }).success).toBe(false));
  it("rejects reversed timeline", () => expect(performanceObservationSchema.safeParse({ ...observation, endSeconds: 1 }).success).toBe(false));
  it("does not evaluate posture from text", () => expect(performanceObservationSchema.safeParse({ ...observation, criterion: "movement" }).success).toBe(false));
  it("does not evaluate voice from text", () => expect(performanceObservationSchema.safeParse({ ...observation, criterion: "voice" }).success).toBe(false));
  it("allows explicitly unassessed missing evidence", () => expect(performanceObservationSchema.safeParse({ ...observation, outcome: "not_assessed", evidence: "" }).success).toBe(true));
  it("has seven independent criteria", () => expect(PERFORMANCE_RUBRIC).toHaveLength(7));
});
