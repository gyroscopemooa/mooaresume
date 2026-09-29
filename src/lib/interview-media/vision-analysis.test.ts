// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeLocalVideo } from "./vision-analysis";

const engine = vi.hoisted(() => ({
  detect: vi.fn(() => ({ faceLandmarks: [] })),
  close: vi.fn(),
  create: vi.fn(),
  fileset: vi.fn(),
}));

vi.mock("@mediapipe/tasks-vision", () => ({
  FaceLandmarker: { createFromOptions: engine.create },
  FilesetResolver: { forVisionTasks: engine.fileset },
}));

describe("local video analysis lifecycle (mocked decoder and detector)", () => {
  let createUrl: ReturnType<typeof vi.fn>;
  let revokeUrl: ReturnType<typeof vi.fn>;
  let fetchModel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    createUrl = vi.fn(() => "blob:local-test-video");
    revokeUrl = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    fetchModel = vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ "content-type": "application/octet-stream" }), arrayBuffer: async () => new ArrayBuffer(100_000) });
    vi.stubGlobal("fetch", fetchModel);
    const times = new WeakMap<HTMLMediaElement, number>();
    vi.spyOn(HTMLMediaElement.prototype, "duration", "get").mockReturnValue(2.8);
    vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(2);
    vi.spyOn(HTMLMediaElement.prototype, "currentTime", "get").mockImplementation(function (this: HTMLMediaElement) { return times.get(this) ?? 0; });
    vi.spyOn(HTMLMediaElement.prototype, "currentTime", "set").mockImplementation(function (this: HTMLMediaElement, value: number) {
      times.set(this, value);
      queueMicrotask(() => this.dispatchEvent(new Event("seeked")));
    });
    vi.spyOn(HTMLVideoElement.prototype, "videoWidth", "get").mockReturnValue(1280);
    vi.spyOn(HTMLVideoElement.prototype, "videoHeight", "get").mockReturnValue(720);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(function (this: HTMLMediaElement) { queueMicrotask(() => this.dispatchEvent(new Event("loadeddata"))); });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    engine.create.mockResolvedValue({ detect: engine.detect, close: engine.close });
    engine.fileset.mockResolvedValue({ wasmLoaderPath: "/local/loader.js", wasmBinaryPath: "/local/model.wasm" });
  });

  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("reads only same-origin model assets and gives truthful no-face samples", async () => {
    const progress = vi.fn();
    const result = await analyzeLocalVideo(new Blob(["video"], { type: "video/webm" }), { onProgress: progress });
    expect(fetchModel).toHaveBeenCalledWith("/interview-analysis/mediapipe/face_landmarker.task", expect.objectContaining({ credentials: "same-origin", redirect: "error" }));
    expect(engine.fileset).toHaveBeenCalledWith("/interview-analysis/mediapipe/wasm");
    expect(engine.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ runningMode: "IMAGE", numFaces: 3, outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false }));
    expect(result.frames.map(({ timeSeconds, status }) => ({ timeSeconds, status }))).toEqual([{ timeSeconds: 0, status: "no_face" }, { timeSeconds: 1, status: "no_face" }, { timeSeconds: 2, status: "no_face" }]);
    expect(result.summary.medianAbsoluteRollDegrees).toBeNull();
    expect(progress).toHaveBeenLastCalledWith(3, 3);
    expect(engine.close).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledWith("blob:local-test-video");
  });

  it("rejects an already cancelled run before touching media or fetching assets", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(analyzeLocalVideo(new Blob(["video"], { type: "video/webm" }), { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(createUrl).not.toHaveBeenCalled();
    expect(fetchModel).not.toHaveBeenCalled();
  });

  it("cancels between samples, disposes the detector and does not return partial claims", async () => {
    const controller = new AbortController();
    await expect(analyzeLocalVideo(new Blob(["video"], { type: "video/webm" }), {
      signal: controller.signal,
      onProgress: (completed) => { if (completed === 1) controller.abort(); },
    })).rejects.toMatchObject({ name: "AbortError" });
    expect(engine.detect).toHaveBeenCalledOnce();
    expect(engine.close).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledOnce();
  });

  it("shows missing model rather than fabricating landmark results", async () => {
    fetchModel.mockResolvedValue({ ok: false, headers: new Headers() });
    await expect(analyzeLocalVideo(new Blob(["video"], { type: "video/webm" }))).rejects.toThrow("설치되지 않았습니다");
    expect(engine.create).not.toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalledOnce();
  });

  it("handles infinite MediaRecorder WebM duration only with an explicit duration hint", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "duration", "get").mockReturnValue(Infinity);
    await expect(analyzeLocalVideo(new Blob(["video"], { type: "video/webm" }))).rejects.toThrow("영상 길이");
    const result = await analyzeLocalVideo(new Blob(["video"], { type: "video/webm" }), { durationHintSeconds: 1.4 });
    expect(result.frames).toHaveLength(2);
    expect(result.durationSeconds).toBe(1.4);
  });

  it("rejects audio-only input before requesting the model", async () => {
    await expect(analyzeLocalVideo(new Blob(["audio"], { type: "audio/webm" }))).rejects.toThrow("음성 전용");
    expect(fetchModel).not.toHaveBeenCalled();
    expect(createUrl).not.toHaveBeenCalled();
  });

  it("cleans up and reports a decoder timeout instead of waiting forever", async () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
    const pending = analyzeLocalVideo(new Blob(["video"], { type: "video/webm" }));
    const assertion = expect(pending).rejects.toThrow("시간이 초과");
    await vi.advanceTimersByTimeAsync(15_001);
    await assertion;
    expect(fetchModel).not.toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalledOnce();
  });
});
