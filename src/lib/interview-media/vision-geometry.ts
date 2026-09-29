/** Geometry only: these observations are not gaze, emotion, personality or hiring scores. */
export type VisionLandmark = { x: number; y: number; z: number };
export type VisionBounds = { x: number; y: number; width: number; height: number };
export type VisionFrame = {
  timeSeconds: number;
  status: "single_face" | "no_face" | "multiple_faces" | "invalid_geometry";
  landmarks: VisionLandmark[];
  bounds: VisionBounds | null;
  /** Projected eye-line angle in image coordinates. NOT a calibrated 3D head pose. */
  rollDegrees: number | null;
};

export type VisionAnalysisResult = {
  schemaVersion: "vision-observations-v1";
  engine: "MediaPipe Face Landmarker / local IMAGE samples";
  durationSeconds: number;
  analyzedSeconds: number;
  sampleIntervalSeconds: 1;
  width: number;
  height: number;
  frames: VisionFrame[];
  summary: {
    sampleCount: number;
    singleFaceSamples: number;
    missingFaceSamples: number;
    multipleFaceSamples: number;
    invalidGeometrySamples: number;
    coveragePercent: number;
    medianAbsoluteRollDegrees: number | null;
  };
  limitations: string[];
};

// Topology derived from MediaPipe, Copyright 2023 The MediaPipe Authors, Apache-2.0.
// https://www.apache.org/licenses/LICENSE-2.0 (provided AS IS, without warranties).
// MediaPipe's published FaceLandmarker face-oval / eye topology. No attractiveness ratios.
// https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/face_landmarker/face_landmarks_connections.ts
const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
const LEFT_EYE = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466, 263];
const RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33];
export const FACE_OVERLAY_CONNECTIONS: readonly (readonly [number, number])[] = [OVAL, LEFT_EYE, RIGHT_EYE].flatMap((chain) => chain.slice(1).map((end, index) => [chain[index], end] as const));

export function buildVisionSampleTimes(durationSeconds: number): number[] {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return [];
  return Array.from({ length: Math.ceil(Math.min(durationSeconds, 180)) }, (_, index) => index);
}

export function createVisionFrame(
  timeSeconds: number,
  faces: readonly (readonly VisionLandmark[])[],
  width: number,
  height: number,
): VisionFrame {
  const empty: VisionFrame = { timeSeconds, status: "no_face", landmarks: [], bounds: null, rollDegrees: null };
  if (!faces.length) return empty;
  // Never silently select or identify one person in a multi-person frame.
  if (faces.length > 1) return { ...empty, status: "multiple_faces" };
  const landmarks = faces[0];
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || landmarks.length < 468
    || landmarks.some(({ x, y, z }) => !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || x < 0 || x > 1 || y < 0 || y > 1)) {
    return { ...empty, status: "invalid_geometry" };
  }
  const xs = landmarks.map((point) => point.x);
  const ys = landmarks.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const bounds = { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
  const eyeA = { x: (landmarks[33].x + landmarks[133].x) / 2, y: (landmarks[33].y + landmarks[133].y) / 2 };
  const eyeB = { x: (landmarks[263].x + landmarks[362].x) / 2, y: (landmarks[263].y + landmarks[362].y) / 2 };
  // Aspect-ratio correction is essential: normalized x and y have different pixel scales.
  const dx = (eyeB.x - eyeA.x) * width;
  const dy = (eyeB.y - eyeA.y) * height;
  const eyeDistance = Math.hypot(dx, dy);
  const eyeRoll = Math.atan2(dy, dx) * 180 / Math.PI;
  const rollDegrees = eyeDistance < Math.max(12, width * 0.025) || bounds.width * width < 40 || bounds.height * height < 40
    ? null
    : ((eyeRoll + 270) % 180) - 90;
  if (rollDegrees === null) return { ...empty, status: "invalid_geometry" };
  return { timeSeconds, status: "single_face", landmarks: landmarks.map(({ x, y, z }) => ({ x, y, z })), bounds, rollDegrees };
}

export function summarizeVisionFrames(frames: readonly VisionFrame[]): VisionAnalysisResult["summary"] {
  const singleFaceSamples = frames.filter((frame) => frame.status === "single_face").length;
  const rolls = frames.flatMap((frame) => frame.rollDegrees === null ? [] : [Math.abs(frame.rollDegrees)]).sort((a, b) => a - b);
  const mid = Math.floor(rolls.length / 2);
  return {
    sampleCount: frames.length,
    singleFaceSamples,
    missingFaceSamples: frames.filter((frame) => frame.status === "no_face").length,
    multipleFaceSamples: frames.filter((frame) => frame.status === "multiple_faces").length,
    invalidGeometrySamples: frames.filter((frame) => frame.status === "invalid_geometry").length,
    coveragePercent: frames.length ? (singleFaceSamples / frames.length) * 100 : 0,
    medianAbsoluteRollDegrees: !rolls.length ? null : rolls.length % 2 ? rolls[mid] : (rolls[mid - 1] + rolls[mid]) / 2,
  };
}

/** Return measured samples only; do not invent interpolated face tracks between samples. */
export function getVisionFrameAtTime(result: VisionAnalysisResult, timeSeconds: number, maxDistanceSeconds = 0.12): VisionFrame | null {
  if (!Number.isFinite(timeSeconds) || timeSeconds < 0 || !Number.isFinite(maxDistanceSeconds) || maxDistanceSeconds < 0) return null;
  const frame = result.frames.reduce<VisionFrame | null>((closest, candidate) => closest === null || Math.abs(candidate.timeSeconds - timeSeconds) < Math.abs(closest.timeSeconds - timeSeconds) ? candidate : closest, null);
  return frame && Math.abs(frame.timeSeconds - timeSeconds) <= maxDistanceSeconds ? frame : null;
}
