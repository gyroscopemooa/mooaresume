import { buildVisionSampleTimes, createVisionFrame, summarizeVisionFrames, type VisionAnalysisResult, type VisionFrame } from "./vision-geometry";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

export { FACE_OVERLAY_CONNECTIONS, getVisionFrameAtTime } from "./vision-geometry";
export type { VisionAnalysisResult, VisionFrame, VisionLandmark } from "./vision-geometry";

const ASSET_ROOT = "/interview-analysis/mediapipe";
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MEDIA_TIMEOUT_MS = 15_000;

type VisionOptions = {
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
  /** Trusted MediaRecorder elapsed duration, only used for unfinalized WebM metadata. */
  durationHintSeconds?: number;
};

function checkAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("영상 분석을 취소했습니다.", "AbortError");
}

function waitForMedia(video: HTMLVideoElement, event: "loadeddata" | "seeked", start: () => void, signal?: AbortSignal): Promise<void> {
  checkAborted(signal);
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener(event, done);
      video.removeEventListener("error", failed);
      signal?.removeEventListener("abort", aborted);
    };
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("이 영상의 프레임을 읽을 수 없습니다. 지원되는 MP4/WebM 파일로 다시 시도해 주세요.")); };
    const aborted = () => { cleanup(); reject(new DOMException("영상 분석을 취소했습니다.", "AbortError")); };
    const timer = setTimeout(() => { cleanup(); reject(new Error("영상 프레임을 불러오는 시간이 초과됐습니다. 더 짧은 영상으로 시도해 주세요.")); }, MEDIA_TIMEOUT_MS);
    video.addEventListener(event, done, { once: true });
    video.addEventListener("error", failed, { once: true });
    signal?.addEventListener("abort", aborted, { once: true });
    try { start(); } catch (error) { cleanup(); reject(error); }
  });
}

async function readLocalModel(signal?: AbortSignal): Promise<Uint8Array> {
  const controller = new AbortController();
  const aborted = () => controller.abort();
  signal?.addEventListener("abort", aborted, { once: true });
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    checkAborted(signal);
    const response = await fetch(`${ASSET_ROOT}/face_landmarker.task`, { signal: controller.signal, credentials: "same-origin", redirect: "error" });
    if (!response.ok || response.headers.get("content-type")?.includes("text/html")) {
      throw new Error("로컬 영상 분석 모델이 설치되지 않았습니다. 개발 환경의 미디어 모델 준비 작업을 실행해 주세요.");
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 100_000 || buffer.byteLength > 50 * 1024 * 1024) throw new Error("로컬 영상 분석 모델 파일이 올바르지 않습니다.");
    return new Uint8Array(buffer);
  } catch (error) {
    checkAborted(signal);
    if (controller.signal.aborted) throw new Error("로컬 영상 모델을 불러오는 시간이 초과됐습니다. 다시 시도해 주세요.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", aborted);
  }
}

/** A cancelled/late detector still owns WASM resources, so dispose it when creation settles. */
function awaitDetector(creation: Promise<FaceLandmarker>, signal?: AbortSignal): Promise<FaceLandmarker> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener("abort", aborted); };
    const fail = (error: Error) => { if (!settled) { settled = true; cleanup(); reject(error); } };
    const aborted = () => fail(new DOMException("영상 분석을 취소했습니다.", "AbortError"));
    const timer = setTimeout(() => fail(new Error("영상 분석 엔진 준비 시간이 초과됐습니다. 브라우저를 확인하고 다시 시도해 주세요.")), 30_000);
    signal?.addEventListener("abort", aborted, { once: true });
    if (signal?.aborted) aborted();
    creation.then((instance) => {
      if (settled) { instance.close(); return; }
      settled = true;
      cleanup();
      resolve(instance);
    }, (error: unknown) => fail(error instanceof Error ? error : new Error("영상 분석 엔진을 준비하지 못했습니다.")));
  });
}

/**
 * Optional, explicit local analysis. No camera access, remote model URL, media upload or face identity.
 * Samples at one-second intervals, at most the first 180 seconds. Each sample is independently
 * detected in IMAGE mode: sparse sampling must not be represented as continuous live tracking.
 */
export async function analyzeLocalVideo(blob: Blob, options: VisionOptions = {}): Promise<VisionAnalysisResult> {
  const { signal, onProgress, durationHintSeconds } = options;
  checkAborted(signal);
  if (typeof document === "undefined") throw new Error("영상 분석은 브라우저에서만 사용할 수 있습니다.");
  if (blob.size === 0 || blob.size > MAX_VIDEO_BYTES) throw new Error("영상 분석은 100MB 이하의 비어 있지 않은 파일만 지원합니다.");
  if (blob.type && !blob.type.startsWith("video/")) throw new Error("음성 전용 파일에는 얼굴 기준점 분석을 적용할 수 없습니다.");

  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  const sourceUrl = URL.createObjectURL(blob);
  let detector: FaceLandmarker | undefined;
  try {
    await waitForMedia(video, "loadeddata", () => { video.src = sourceUrl; video.load(); }, signal);
    const durationSeconds = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : durationHintSeconds;
    if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0 || video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error("영상 길이 또는 영상 트랙을 확인하지 못했습니다. 길이 정보가 있는 MP4/WebM 영상으로 시도해 주세요.");
    }
    const times = buildVisionSampleTimes(durationSeconds);
    onProgress?.(0, times.length);
    const modelAssetBuffer = await readLocalModel(signal);
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    checkAborted(signal);
    const vision = await FilesetResolver.forVisionTasks(`${ASSET_ROOT}/wasm`);
    checkAborted(signal);
    detector = await awaitDetector(FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetBuffer, delegate: "CPU" },
      runningMode: "IMAGE",
      numFaces: 3,
      minFaceDetectionConfidence: 0.6,
      minFacePresenceConfidence: 0.6,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    }), signal);
    checkAborted(signal);
    const width = video.videoWidth;
    const height = video.videoHeight;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 960 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("이 브라우저에서 영상 프레임 처리를 지원하지 않습니다.");
    const frames: VisionFrame[] = [];
    for (const time of times) {
      checkAborted(signal);
      if (Math.abs(video.currentTime - time) > 0.001) {
        await waitForMedia(video, "seeked", () => { video.currentTime = time; }, signal);
      }
      checkAborted(signal);
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) throw new Error("해당 시점의 영상 프레임을 해독하지 못했습니다.");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const observation = detector.detect(canvas);
      frames.push(createVisionFrame(video.currentTime, observation.faceLandmarks, width, height));
      onProgress?.(frames.length, times.length);
      // Inference is synchronous. Yield between bounded samples so cancel/progress can update.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    checkAborted(signal);
    return {
      schemaVersion: "vision-observations-v1",
      engine: "MediaPipe Face Landmarker / local IMAGE samples",
      durationSeconds,
      analyzedSeconds: Math.min(durationSeconds, 180),
      sampleIntervalSeconds: 1,
      width,
      height,
      frames,
      summary: summarizeVisionFrames(frames),
      limitations: [
        "1초마다 추출한 정지 프레임의 관찰입니다. 프레임 사이의 행동은 분석하지 않습니다.",
        "눈 주변 기준점의 2D 기울기이며 정확한 시선 방향·3D 고개 각도가 아닙니다.",
        "조명·가림·안경·촬영 거리·측면 얼굴에 따라 검출이 불안정할 수 있습니다.",
        "미검출은 고개를 돌렸거나 태도가 나쁘다는 의미가 아닙니다. 여러 사람이 보이면 개별 분석을 하지 않습니다.",
        "표정·감정·인성·외모·합격 가능성이나 태도 점수를 판정하지 않습니다.",
        ...(durationSeconds > 180 ? ["기기 자원 보호를 위해 첫 180초만 분석했습니다."] : []),
      ],
    };
  } finally {
    try { detector?.close(); } finally {
      video.pause();
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(sourceUrl);
    }
  }
}
