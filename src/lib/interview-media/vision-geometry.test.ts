import { describe, expect, it } from "vitest";
import { buildVisionSampleTimes, createVisionFrame, FACE_OVERLAY_CONNECTIONS, getVisionFrameAtTime, summarizeVisionFrames, type VisionAnalysisResult, type VisionLandmark } from "./vision-geometry";

function face(): VisionLandmark[] {
  const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  points[33] = { x: 0.30, y: 0.35, z: 0 };
  points[133] = { x: 0.40, y: 0.35, z: 0 };
  points[263] = { x: 0.70, y: 0.35, z: 0 };
  points[362] = { x: 0.60, y: 0.35, z: 0 };
  points[152] = { x: 0.5, y: 0.85, z: 0 };
  return points;
}

describe("local vision observations", () => {
  it("bounds sampling to the first 180 seconds at one-second intervals", () => {
    expect(buildVisionSampleTimes(2.8)).toEqual([0, 1, 2]);
    expect(buildVisionSampleTimes(0.2)).toEqual([0]);
    expect(buildVisionSampleTimes(500)).toHaveLength(180);
    expect(buildVisionSampleTimes(180).at(-1)).toBe(179);
    for (const duration of [0, -1, Infinity, NaN]) expect(buildVisionSampleTimes(duration)).toEqual([]);
  });

  it("measures projected eye-line roll without turning it into gaze or emotion", () => {
    const frame = createVisionFrame(4, [face()], 1280, 720);
    expect(frame.status).toBe("single_face");
    expect(frame.rollDegrees).toBeCloseTo(0);
    expect(frame.timeSeconds).toBe(4);
    expect(frame.landmarks).toHaveLength(478);
    expect(frame).not.toHaveProperty("emotion");
    expect(frame).not.toHaveProperty("gaze");
    expect(frame).not.toHaveProperty("score");
  });

  it("uses pixel aspect ratio rather than treating normalized coordinates as square", () => {
    const points = face();
    points[263].y = 0.55;
    points[362].y = 0.55;
    const frame = createVisionFrame(0, [points], 1920, 1080);
    expect(frame.rollDegrees).toBeCloseTo(Math.atan2(0.2 * 1080, 0.3 * 1920) * 180 / Math.PI);
    expect(frame.rollDegrees).not.toBeCloseTo(Math.atan2(0.2, 0.3) * 180 / Math.PI);
  });

  it("does not identify one person or retain landmarks when multiple faces are seen", () => {
    const frame = createVisionFrame(1, [face(), face()], 1280, 720);
    expect(frame).toMatchObject({ status: "multiple_faces", landmarks: [], bounds: null, rollDegrees: null });
    expect(createVisionFrame(2, [], 1280, 720).status).toBe("no_face");
  });

  it("excludes partial, nonfinite, tiny and invalid landmark geometry", () => {
    const partial = face(); partial[10].x = -0.02;
    const nonfinite = face(); nonfinite[10].y = NaN;
    for (const points of [partial, nonfinite, face().slice(0, 30)]) {
      expect(createVisionFrame(0, [points], 1280, 720).status).toBe("invalid_geometry");
    }
    expect(createVisionFrame(0, [face()], 20, 20).rollDegrees).toBeNull();
    expect(createVisionFrame(0, [face()], 0, 720).status).toBe("invalid_geometry");
  });

  it("counts unavailable observations separately instead of converting them into bad scores", () => {
    const frames = [createVisionFrame(0, [face()], 1280, 720), createVisionFrame(1, [], 1280, 720), createVisionFrame(2, [face(), face()], 1280, 720), createVisionFrame(3, [[]], 1280, 720)];
    expect(summarizeVisionFrames(frames)).toEqual({ sampleCount: 4, singleFaceSamples: 1, missingFaceSamples: 1, multipleFaceSamples: 1, invalidGeometrySamples: 1, coveragePercent: 25, medianAbsoluteRollDegrees: 0 });
    expect(summarizeVisionFrames([]).medianAbsoluteRollDegrees).toBeNull();
  });

  it("does not interpolate fake face tracks between sampled frames", () => {
    const frames = [createVisionFrame(0, [face()], 1280, 720), createVisionFrame(1, [], 1280, 720)];
    const result: VisionAnalysisResult = { schemaVersion: "vision-observations-v1", engine: "MediaPipe Face Landmarker / local IMAGE samples", durationSeconds: 2, analyzedSeconds: 2, sampleIntervalSeconds: 1, width: 1280, height: 720, frames, summary: summarizeVisionFrames(frames), limitations: [] };
    expect(getVisionFrameAtTime(result, 0.05)).toBe(frames[0]);
    expect(getVisionFrameAtTime(result, 0.5)).toBeNull();
    expect(getVisionFrameAtTime(result, 1)?.status).toBe("no_face");
    expect(getVisionFrameAtTime(result, NaN)).toBeNull();
    expect(getVisionFrameAtTime(result, -0.1)).toBeNull();
  });

  it("all overlay topology indices exist in a face-mesh result", () => {
    expect(FACE_OVERLAY_CONNECTIONS.length).toBeGreaterThan(40);
    expect(FACE_OVERLAY_CONNECTIONS.every(([start, end]) => start >= 0 && end >= 0 && start < 468 && end < 468)).toBe(true);
  });
});
