import { createVisionFrame, type VisionFrame, type VisionLandmark } from "./vision-geometry";

export type PosePoint = VisionLandmark & { visibility?: number; presence?: number };
export type ReplayFaceMeasurements = {
  /** Pixel-space eyelid gap divided by eye-corner distance. Not an emotion or alertness score. */
  eyeOpeningRatio: number | null;
  /** Iris position within the visible eye, along the image-left-to-right eye axis. Not gaze. */
  irisHorizontalRatio: number | null;
  /** Pixel-space inner-lip separation divided by mouth-corner distance. */
  mouthOpeningRatio: number | null;
};
export type ReplayPoseObservation = {
  status: "single_person" | "no_person" | "multiple_people" | "unavailable";
  /** Missing/low-confidence joints remain null and are never joined by invented lines. */
  landmarks: (PosePoint | null)[];
  shoulderTiltDegrees: number | null;
  torsoTiltDegrees: number | null;
};
export type ReplayObservation = {
  timeSeconds: number;
  measuredAtMs: number;
  width: number;
  height: number;
  face: VisionFrame;
  faceMeasurements: ReplayFaceMeasurements;
  pose: ReplayPoseObservation;
};

// Published MediaPipe Pose topology: shoulders, arms, trunk, hips, knees, ankles.
export const REPLAY_POSE_CONNECTIONS: readonly (readonly [number, number])[] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [29, 31], [28, 30], [30, 32],
];

function distance(a: VisionLandmark, b: VisionLandmark, width: number, height: number) {
  return Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
}

function opening(points: readonly VisionLandmark[], corners: readonly [number, number], gap: readonly [number, number], width: number, height: number) {
  const span = distance(points[corners[0]], points[corners[1]], width, height);
  return span >= 10 ? distance(points[gap[0]], points[gap[1]], width, height) / span : null;
}

function irisRatio(points: readonly VisionLandmark[], corners: readonly [number, number], irisIndex: number, aperture: number | null, width: number, height: number) {
  if (points.length < 478 || aperture === null || aperture + 1e-9 < .1) return null;
  const endpoints = [points[corners[0]], points[corners[1]]].sort((a, b) => a.x - b.x);
  const [a, b] = endpoints;
  const dx = (b.x - a.x) * width;
  const dy = (b.y - a.y) * height;
  const denominator = dx * dx + dy * dy;
  if (denominator < 100) return null;
  const iris = points[irisIndex];
  const projection = (((iris.x - a.x) * width) * dx + ((iris.y - a.y) * height) * dy) / denominator;
  return projection >= 0 && projection <= 1 ? projection : null;
}

export function measureReplayFace(face: VisionFrame, width: number, height: number): ReplayFaceMeasurements {
  const empty: ReplayFaceMeasurements = { eyeOpeningRatio: null, irisHorizontalRatio: null, mouthOpeningRatio: null };
  if (face.status !== "single_face") return empty;
  const points = face.landmarks;
  const left = opening(points, [33, 133], [159, 145], width, height);
  const right = opening(points, [263, 362], [386, 374], width, height);
  const irises = [irisRatio(points, [33, 133], 468, left, width, height), irisRatio(points, [263, 362], 473, right, width, height)].filter((value): value is number => value !== null);
  return {
    eyeOpeningRatio: left !== null && right !== null && left <= 1 && right <= 1 ? (left + right) / 2 : null,
    irisHorizontalRatio: irises.length === 2 ? (irises[0] + irises[1]) / 2 : null,
    mouthOpeningRatio: opening(points, [61, 291], [13, 14], width, height),
  };
}

function validPosePoint(point: PosePoint | undefined): point is PosePoint {
  return !!point && [point.x, point.y, point.z, point.visibility].every((n) => typeof n === "number" && Number.isFinite(n))
    && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1
    && (point.visibility ?? 0) >= .65
    // 0.10.32 exports joint visibility, but not joint presence. Task-level presence is gated.
    && (point.presence === undefined || Number.isFinite(point.presence) && point.presence >= .65);
}

export function measureReplayPose(poses: readonly (readonly PosePoint[])[] | null, width: number, height: number): ReplayPoseObservation {
  const empty: ReplayPoseObservation = { status: "unavailable", landmarks: [], shoulderTiltDegrees: null, torsoTiltDegrees: null };
  if (poses === null || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return empty;
  if (!poses.length) return { ...empty, status: "no_person" };
  if (poses.length > 1) return { ...empty, status: "multiple_people" };
  if (poses[0].length !== 33) return empty;
  const landmarks = poses[0].map((point) => validPosePoint(point) ? { ...point } : null);
  const [left, right, leftHip, rightHip] = [landmarks[11], landmarks[12], landmarks[23], landmarks[24]];
  let shoulderTiltDegrees: number | null = null;
  let torsoTiltDegrees: number | null = null;
  if (left && right && distance(left, right, width, height) >= 25) {
    const raw = Math.atan2((right.y - left.y) * height, (right.x - left.x) * width) * 180 / Math.PI;
    shoulderTiltDegrees = ((raw + 270) % 180) - 90;
    if (leftHip && rightHip) {
      const dx = ((left.x + right.x) - (leftHip.x + rightHip.x)) / 2 * width;
      const dy = ((leftHip.y + rightHip.y) - (left.y + right.y)) / 2 * height;
      if (Math.hypot(dx, dy) >= 30 && dy > 0) torsoTiltDegrees = Math.atan2(dx, dy) * 180 / Math.PI;
    }
  }
  return { status: "single_person", landmarks, shoulderTiltDegrees, torsoTiltDegrees };
}

export function createReplayObservation(timeSeconds: number, measuredAtMs: number, faces: readonly (readonly VisionLandmark[])[], poses: readonly (readonly PosePoint[])[] | null, width: number, height: number): ReplayObservation {
  const face = createVisionFrame(timeSeconds, faces, width, height);
  // Multiple visible people are ambiguous; never associate one detected body with another face.
  const pose = face.status === "multiple_faces"
    ? { status: "multiple_people" as const, landmarks: [], shoulderTiltDegrees: null, torsoTiltDegrees: null }
    : measureReplayPose(poses, width, height);
  return { timeSeconds, measuredAtMs, width, height, face, faceMeasurements: measureReplayFace(face, width, height), pose };
}

/** Maximum display lag, not an interpolation permission. Seeking/ended always clears results. */
export function isReplayObservationFresh(observation: ReplayObservation | null, currentTime: number, nowMs: number, playbackRate: number, paused: boolean, seeking: boolean, ended: boolean): boolean {
  if (!observation || seeking || ended || ![currentTime, nowMs, playbackRate].every(Number.isFinite) || playbackRate <= 0) return false;
  const delta = Math.abs(currentTime - observation.timeSeconds);
  if (paused) return delta <= .05;
  return nowMs >= observation.measuredAtMs && nowMs - observation.measuredAtMs <= 250 && delta <= .2 * Math.max(1, playbackRate);
}
