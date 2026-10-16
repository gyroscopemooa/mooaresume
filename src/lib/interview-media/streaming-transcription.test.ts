import { describe, expect, it } from "vitest";
import { hasTranscribableSignal, mergeOverlappingTranscript, signalDbfs } from "./streaming-transcription";

describe("streaming transcription guards", () => {
  it("rejects silence and very low background signal before neural transcription", () => {
    expect(signalDbfs(new Float32Array(16_000))).toBe(-100);
    expect(hasTranscribableSignal(new Float32Array(16_000))).toBe(false);
    expect(hasTranscribableSignal(Float32Array.from({ length: 16_000 }, () => 0.001))).toBe(false);
  });

  it("keeps ordinary speech-level signal", () => {
    const speech = Float32Array.from({ length: 16_000 }, (_, index) => Math.sin(index / 8) * 0.04);
    expect(signalDbfs(speech)).toBeGreaterThan(-40);
    expect(hasTranscribableSignal(speech)).toBe(true);
  });

  it("removes repeated words at overlapping chunk boundaries", () => {
    expect(mergeOverlappingTranscript("작업 표준을 정확히 익히고", "정확히 익히고 이상 징후를 확인하겠습니다."))
      .toBe("작업 표준을 정확히 익히고 이상 징후를 확인하겠습니다.");
    expect(mergeOverlappingTranscript("품질을 확인합니다.", "안전을 지키겠습니다."))
      .toBe("품질을 확인합니다. 안전을 지키겠습니다.");
  });
});
