import { describe, expect, it } from "vitest";
import {
  LOCAL_INTERVIEW_PRESETS,
  calculateTimeUsagePercent,
  formatInterviewSeconds,
  interviewPresetPrototypeSchema,
  selectSupportedRecorderMimeType,
} from "@/domain/interview-prototype";

describe("interview PRO local prototype", () => {
  it("keeps every preset traceable and bounded", () => {
    expect(() => interviewPresetPrototypeSchema.array().parse(LOCAL_INTERVIEW_PRESETS)).not.toThrow();
    for (const preset of LOCAL_INTERVIEW_PRESETS) {
      expect(preset.sourceUrls.length).toBeGreaterThan(0);
      expect(preset.questions.length).toBeGreaterThan(0);
      expect(preset.config.answerSeconds).toBeGreaterThanOrEqual(15);
    }
  });

  it("does not present the Hyundai prototype questions as verified actual questions", () => {
    const hyundai = LOCAL_INTERVIEW_PRESETS.find((preset) => preset.id === "hyundai-production-demo");
    expect(hyundai?.evidenceStatus).toBe("role_based_estimate");
    expect(hyundai?.questions.every((question) => question.evidenceStatus !== "official")).toBe(true);
  });

  it("formats timers and clamps time usage", () => {
    expect(formatInterviewSeconds(90)).toBe("01:30");
    expect(formatInterviewSeconds(-4)).toBe("00:00");
    expect(calculateTimeUsagePercent(63, 90)).toBe(70);
    expect(calculateTimeUsagePercent(120, 90)).toBe(100);
  });

  it("picks the first supported recorder format", () => {
    const supported = new Set(["video/webm;codecs=vp8,opus", "video/webm"]);
    expect(selectSupportedRecorderMimeType((mimeType) => supported.has(mimeType))).toBe("video/webm;codecs=vp8,opus");
    expect(selectSupportedRecorderMimeType(() => false)).toBeUndefined();
  });
});
