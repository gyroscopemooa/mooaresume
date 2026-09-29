import type { FaceLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import { createReplayObservation, isReplayObservationFresh, type ReplayObservation } from "./replay-observation-geometry";

export type { ReplayObservation } from "./replay-observation-geometry";
export type ReplayStatus = { state: "loading" | "ready" | "error"; message: string; poseAvailable: boolean };
type ReplayOptions = { signal: AbortSignal; onFrame: (frame: ReplayObservation | null) => void; onStatus: (status: ReplayStatus) => void; includePose?: boolean };
const ROOT = "/interview-analysis/mediapipe";

function aborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("영상 추적을 중단했습니다.", "AbortError");
}

async function readModel(name: "face_landmarker.task" | "pose_landmarker_lite.task", signal: AbortSignal) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, 30_000);
  try {
    aborted(signal);
    const response = await fetch(`${ROOT}/${name}`, { signal: controller.signal, credentials: "same-origin", redirect: "error" });
    if (!response.ok || response.headers.get("content-type")?.includes("text/html")) throw new Error("로컬 영상 모델이 설치되지 않았습니다.");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 100_000 || bytes.byteLength > 50 * 1024 * 1024) throw new Error("로컬 영상 모델 파일을 확인할 수 없습니다.");
    return new Uint8Array(bytes);
  } finally { clearTimeout(timeout); signal.removeEventListener("abort", cancel); }
}

async function boundedDetector<T extends { close(): void }>(creation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const cleanup = () => { clearTimeout(timeout); signal.removeEventListener("abort", cancel); };
    const fail = (error: unknown) => { if (!settled) { settled = true; cleanup(); reject(error); } };
    const cancel = () => fail(new DOMException("영상 추적을 중단했습니다.", "AbortError"));
    const timeout = setTimeout(() => fail(new Error("영상 엔진 준비 시간이 초과됐습니다.")), 30_000);
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    creation.then((instance) => { if (settled) instance.close(); else { settled = true; cleanup(); resolve(instance); } }, fail);
  });
}

/**
 * Explicit local opt-in only. Samples actual presented frames up to 8Hz. MediaPipe inference
 * is synchronous; the image is bounded to 640px and skips frames rather than queuing work.
 * No camera access, face identity, emotion or suitability judgments are performed.
 */
export async function startReplayObservations(video: HTMLVideoElement, options: ReplayOptions): Promise<() => void> {
  const { signal, onFrame, onStatus } = options;
  aborted(signal);
  onStatus({ state: "loading", message: "기기 내 영상 모델을 준비하고 있습니다.", poseAvailable: false });
  let face: FaceLandmarker | null = null;
  let pose: PoseLandmarker | null = null;
  let disposed = false;
  let frameId = 0;
  let freshnessId = 0;
  let usingVideoFrames = false;
  let lastMeasuredAt = -Infinity;
  let lastMediaTime = -1;
  let timestamp = 0;
  let observation: ReplayObservation | null = null;
  let resetting = false;
  let resetVersion = 0;
  let resetQueue = Promise.resolve();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("이 브라우저에서 영상 추적을 지원하지 않습니다.");
  const clear = () => { observation = null; onFrame(null); };
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    resetVersion++;
    if (usingVideoFrames) video.cancelVideoFrameCallback(frameId); else cancelAnimationFrame(frameId);
    cancelAnimationFrame(freshnessId);
    video.removeEventListener("seeking", invalidate);
    video.removeEventListener("seeked", seeked);
    video.removeEventListener("loadeddata", requestPausedFrame);
    video.removeEventListener("pause", requestPausedFrame);
    video.removeEventListener("ended", invalidate);
    video.removeEventListener("emptied", cleanup);
    video.removeEventListener("error", cleanup);
    signal.removeEventListener("abort", cleanup);
    clear();
    face?.close(); pose?.close(); face = null; pose = null;
    canvas.width = 0; canvas.height = 0;
  };
  const invalidate = () => { lastMediaTime = -1; clear(); };
  const reportFailure = (error: unknown) => {
    if (disposed || signal.aborted) return;
    onStatus({ state: "error", message: error instanceof Error ? error.message : "영상 추적을 이어갈 수 없습니다.", poseAvailable: !!pose });
    cleanup();
  };
  const infer = (mediaTime: number, force = false) => {
    if (disposed || resetting || signal.aborted || !face || video.seeking || video.ended || video.readyState < 2 || !video.videoWidth || !video.videoHeight || document.hidden) return;
    const now = performance.now();
    if (!force && (now - lastMeasuredAt < 125 || Math.abs(mediaTime - lastMediaTime) < .0001)) return;
    lastMeasuredAt = now;
    lastMediaTime = mediaTime;
    const width = video.videoWidth, height = video.videoHeight;
    const scale = Math.min(1, 640 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      timestamp = Math.max(timestamp + 1, now);
      const faces = face.detectForVideo(canvas, timestamp);
      const poses = pose?.detectForVideo(canvas, timestamp);
      observation = createReplayObservation(mediaTime, now, faces.faceLandmarks, poses?.landmarks ?? null, width, height);
      poses?.close();
      if (isReplayObservationFresh(observation, video.currentTime, performance.now(), video.playbackRate, video.paused, video.seeking, video.ended)) onFrame(observation);
      else clear(); // Slow-device inference must not publish coordinates over a later video frame.
    } catch (error) { reportFailure(error); }
  };
  const requestPausedFrame = () => { if (!video.ended) infer(video.currentTime, true); };
  const seeked = () => {
    const version = ++resetVersion;
    resetting = true;
    clear();
    resetQueue = resetQueue.then(async () => {
      if (disposed || signal.aborted || version !== resetVersion) return;
      // Reset the temporal graph after discontinuous seeks; monotonic inference timestamps are
      // separate from media time, so seeking backwards never sends backwards graph timestamps.
      await face?.setOptions({ runningMode: "IMAGE" });
      await pose?.setOptions({ runningMode: "IMAGE" });
      if (disposed || signal.aborted) return;
      await face?.setOptions({ runningMode: "VIDEO" });
      await pose?.setOptions({ runningMode: "VIDEO" });
      if (disposed || signal.aborted || version !== resetVersion) return;
      resetting = false;
      infer(video.currentTime, true);
    }).catch(reportFailure);
  };
  try {
    const bytes = await readModel("face_landmarker.task", signal);
    const { FaceLandmarker, PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    aborted(signal);
    const files = await FilesetResolver.forVisionTasks(`${ROOT}/wasm`);
    aborted(signal);
    face = await boundedDetector(FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetBuffer: bytes, delegate: "CPU" }, runningMode: "VIDEO", numFaces: 3,
      minFaceDetectionConfidence: .6, minFacePresenceConfidence: .6, minTrackingConfidence: .65,
      outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
    }), signal);
    let poseWarning = "";
    if (options.includePose !== false) {
      try {
        const poseBytes = await readModel("pose_landmarker_lite.task", signal);
        pose = await boundedDetector(PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetBuffer: poseBytes, delegate: "CPU" }, runningMode: "VIDEO", numPoses: 2,
          minPoseDetectionConfidence: .65, minPosePresenceConfidence: .65, minTrackingConfidence: .65, outputSegmentationMasks: false,
        }), signal);
      } catch { aborted(signal); poseWarning = " 신체 모델을 사용할 수 없어 얼굴만 추적합니다."; }
    }
    aborted(signal);
    video.addEventListener("seeking", invalidate);
    video.addEventListener("seeked", seeked);
    video.addEventListener("loadeddata", requestPausedFrame);
    video.addEventListener("pause", requestPausedFrame);
    video.addEventListener("ended", invalidate);
    video.addEventListener("emptied", cleanup);
    video.addEventListener("error", cleanup);
    signal.addEventListener("abort", cleanup, { once: true });
    usingVideoFrames = typeof video.requestVideoFrameCallback === "function";
    const loop = (_now: number, metadata?: VideoFrameCallbackMetadata) => {
      if (disposed) return;
      infer(metadata?.mediaTime ?? video.currentTime);
      if (!disposed) frameId = usingVideoFrames ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop);
    };
    const freshnessLoop = () => {
      if (disposed) return;
      if (observation && !isReplayObservationFresh(observation, video.currentTime, performance.now(), video.playbackRate, video.paused, video.seeking, video.ended)) clear();
      freshnessId = requestAnimationFrame(freshnessLoop);
    };
    onStatus({ state: "ready", message: `재생 프레임에서 최대 초당 8회 관찰합니다.${poseWarning}`, poseAvailable: !!pose });
    infer(video.currentTime, true);
    if (!disposed) {
      frameId = usingVideoFrames ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop);
      freshnessId = requestAnimationFrame(freshnessLoop);
    }
    return cleanup;
  } catch (error) { cleanup(); throw error; }
}
