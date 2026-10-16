import { describe, expect, it } from "vitest";
import { analyzeInterviewAudio } from "./interview-audio-analysis";
import { buildInterviewDeliveryReport } from "./interview-delivery-report";
import { summarizeVisionFrames, type VisionAnalysisResult, type VisionFrame } from "@/lib/interview-media/vision-geometry";

describe("interview delivery report", () => {
  it("turns measured audio into cautious coaching without personality claims", () => {
    const samples = Float32Array.from({ length: 192_000 }, (_, index) => .15 * Math.sin(index / 12));
    const report = buildInterviewDeliveryReport(analyzeInterviewAudio(samples, 16_000), null);
    expect(report?.voice.join(" ")).toContain("결론까지 비교적 일정하게 전달됐습니다");
    expect(report?.voice.join(" ")).not.toMatch(/dBFS|Hz|초 중/);
    expect([...(report?.voice ?? []), ...(report?.visual ?? []), ...(report?.actions ?? [])].join(" ")).not.toMatch(/인성|자신감|합격/);
    expect(report?.caveats.join(" ")).toContain("자신감을 확정하거나 점수화하지 않습니다");
  });
  it("does not turn a sub-three-second clip into voice-quality feedback", () => {
    const samples = Float32Array.from({ length: 11_200 }, () => .01);
    const report = buildInterviewDeliveryReport(analyzeInterviewAudio(samples, 16_000), null);
    expect(report?.voice).toEqual(["분석 가능한 발화가 너무 짧아 목소리 크기와 말투에 대한 피드백을 만들기 어렵습니다."]);
    expect(report?.actions.join(" ")).toContain("최소 10초 이상");
    expect(report?.holds.join(" ")).toContain("전달 평가는 보류");
  });
  it("creates a replayable coaching event when the ending voice signal falls materially", () => {
    const samples = Float32Array.from({ length: 16_000 * 12 }, (_, index) => (index < 16_000 * 9 ? .2 : .02) * Math.sin(index / 12));
    const report = buildInterviewDeliveryReport(analyzeInterviewAudio(samples, 16_000), null);
    expect(report?.evidenceEvents).toEqual(expect.arrayContaining([expect.objectContaining({ source: "audio", title: "답변 마지막 부분의 전달력" })]));
    expect(report?.actions.join(" ")).toContain("마지막 결론 문장");
  });
  it("withholds coaching when decoded audio is much shorter than the recorded answer", () => {
    const report = buildInterviewDeliveryReport(analyzeInterviewAudio(new Float32Array(11_200), 16_000), null, 14);
    expect(report?.voice.join(" ")).toContain("원본 답변 길이보다 음성 분석 구간이 지나치게 짧아");
    expect(report?.holds.join(" ")).toContain("모든 음성 평가는 보류");
    expect(report?.evidenceEvents).toHaveLength(0);
  });
  it("grounds pace changes and repeated fillers in timestamped transcript segments", () => {
    const audio = analyzeInterviewAudio(Float32Array.from({ length: 16_000 * 12 }, (_, index) => .15 * Math.sin(index / 12)), 16_000);
    const transcript = {
      text: "저는 경험이 있습니다 어 문제를 해결했고 음 결과를 만들었습니다",
      durationSeconds: 12,
      segments: [
        { start: 0, end: 3, text: "저는 경험이 있습니다 어" },
        { start: 3, end: 4, text: "문제를 빠르게 정확하게 끝까지 해결했습니다" },
        { start: 4, end: 8, text: "음 결과를 만들었습니다" },
        { start: 8, end: 12, text: "이 경험을 활용하겠습니다" },
      ],
    };
    const report = buildInterviewDeliveryReport(audio, null, 12, transcript);
    expect(report?.voice.join(" ")).toContain("속도가");
    expect(report?.voice.join(" ")).toContain("머뭇거림");
    expect(report?.evidenceEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "audio", startSeconds: 3, title: "속도가 빨라진 구간" }),
      expect.objectContaining({ source: "audio", title: "머뭇거림 표현 확인" }),
    ]));
  });
  it("reports repeated face-direction changes as an observation, never eye gaze", () => {
    const frames: VisionFrame[] = Array.from({ length: 32 }, (_, index) => ({
      timeSeconds: index * .5,
      status: "single_face",
      landmarks: [],
      bounds: { x: .4, y: .25, width: .2, height: .3 },
      rollDegrees: 0,
      faceTurnRatio: Math.floor(index / 4) % 2 === 0 ? -.2 : .2,
      mouthCornerLiftRatio: 0,
    }));
    const vision: VisionAnalysisResult = { schemaVersion: "vision-observations-v1", engine: "MediaPipe Face Landmarker / local IMAGE samples", durationSeconds: 20, analyzedSeconds: 20, sampleIntervalSeconds: .5, width: 1280, height: 720, frames, summary: summarizeVisionFrames(frames), limitations: [] };
    const report = buildInterviewDeliveryReport(null, vision, 20);
    expect(report?.visual.join(" ")).toContain("얼굴 방향이 좌우로 반복");
    expect(report?.evidenceEvents).toEqual(expect.arrayContaining([expect.objectContaining({ title: "얼굴 방향이 바뀐 구간" })]));
    expect(report?.caveats.join(" ")).toContain("정확한 눈 시선");
  });
  it("turns sustained framing and lighting observations into actionable visual coaching", () => {
    const frames: VisionFrame[] = Array.from({ length: 32 }, (_, index) => ({
      timeSeconds: index * .5,
      status: "single_face",
      landmarks: [],
      bounds: { x: .47, y: .35, width: .1, height: .16 },
      rollDegrees: 0,
      faceTurnRatio: 0,
      mouthCornerLiftRatio: 0,
      frameLuminance: 35,
    }));
    const vision: VisionAnalysisResult = { schemaVersion: "vision-observations-v1", engine: "MediaPipe Face + Pose Landmarker / local IMAGE samples", durationSeconds: 16, analyzedSeconds: 16, sampleIntervalSeconds: .5, width: 1280, height: 720, frames, summary: summarizeVisionFrames(frames), limitations: [] };
    const report = buildInterviewDeliveryReport(null, vision, 16);
    expect(report?.visual.join(" ")).toContain("얼굴이 화면에서 작게");
    expect(report?.visual.join(" ")).toContain("영상 전체가 어두운");
    expect(report?.actions.join(" ")).toContain("얼굴과 어깨");
    expect(report?.actions.join(" ")).toContain("얼굴 앞쪽");
  });
  it("reports only sustained measured hand and visible lower-body movement", () => {
    const frames: VisionFrame[] = Array.from({ length: 32 }, (_, index) => ({
      timeSeconds: index * .5,
      status: "single_face",
      landmarks: [],
      bounds: { x: .35, y: .2, width: .3, height: .45 },
      rollDegrees: 0,
      faceTurnRatio: 0,
      mouthCornerLiftRatio: 0,
      poseStatus: "single_person",
      shoulderTiltDegrees: 0,
      torsoTiltDegrees: 0,
      handNearFace: index < 8,
      lowerBodyCenter: { x: index % 2 ? .62 : .42, y: .82 },
    }));
    const vision: VisionAnalysisResult = { schemaVersion: "vision-observations-v1", engine: "MediaPipe Face + Pose Landmarker / local IMAGE samples", durationSeconds: 16, analyzedSeconds: 16, sampleIntervalSeconds: .5, width: 1280, height: 720, frames, summary: summarizeVisionFrames(frames), limitations: [] };
    const report = buildInterviewDeliveryReport(null, vision, 16);
    expect(report?.visual.join(" ")).toContain("손이 얼굴 주변");
    expect(report?.visual.join(" ")).toContain("하체 위치");
    expect(report?.evidenceEvents).toEqual(expect.arrayContaining([expect.objectContaining({ title: "손이 얼굴 주변에 보인 장면" })]));
  });
});
