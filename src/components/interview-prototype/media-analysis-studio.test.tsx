// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { analyzeInterviewAudio } from "@/domain/interview-audio-analysis";
import { createVisionFrame, summarizeVisionFrames, type VisionAnalysisResult } from "@/lib/interview-media/vision-geometry";
import { MediaAnalysisStudio, type StudioRecording } from "./media-analysis-studio";
import type { InterviewFeedbackPanelProps } from "./interview-feedback-panel";

const analysis = vi.hoisted(() => ({ audio: vi.fn(), vision: vi.fn() }));
const integration = vi.hoisted(() => ({ feedback: vi.fn(), replay: vi.fn() }));
vi.mock("./interview-feedback-panel", () => ({
  InterviewFeedbackPanel: (props: InterviewFeedbackPanelProps) => {
    integration.feedback(props);
    return <section data-testid="feedback-panel"><h2>답변 피드백</h2>{props.disabledReason && <p>{props.disabledReason}</p>}<button type="button" onClick={() => props.onSeek?.(5)}>5초 답변 근거 확인</button></section>;
  },
}));
vi.mock("./replay-observation-overlay", () => ({
  ReplayObservationOverlay: (props: { enabled: boolean; sourceKey: string }) => { integration.replay(props); return null; },
}));
vi.mock("@/lib/interview-media/audio-client", () => ({
  MAX_MEDIA_BYTES: 80 * 1024 * 1024,
  analyzeAudioBlob: analysis.audio,
  createCalibrationWav: () => new Blob(["calibration"], { type: "audio/wav" }),
}));
vi.mock("@/lib/interview-media/vision-analysis", async () => ({
  ...await import("@/lib/interview-media/vision-geometry"),
  analyzeLocalVideo: analysis.vision,
}));

const audioResult = analyzeInterviewAudio(new Float32Array(32_000), 16_000);
const face = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
face[33] = { x: 0.3, y: 0.35, z: 0 };
face[133] = { x: 0.4, y: 0.35, z: 0 };
face[263] = { x: 0.7, y: 0.35, z: 0 };
face[362] = { x: 0.6, y: 0.35, z: 0 };
face[152] = { x: 0.5, y: 0.85, z: 0 };
const frames = [0, 1].map((seconds) => createVisionFrame(seconds, [face], 1280, 720));
const visionResult: VisionAnalysisResult = {
  schemaVersion: "vision-observations-v1",
  engine: "MediaPipe Face Landmarker / local IMAGE samples",
  durationSeconds: 30,
  analyzedSeconds: 30,
  sampleIntervalSeconds: 1,
  width: 1280,
  height: 720,
  frames,
  summary: summarizeVisionFrames(frames),
  limitations: [],
};
const recording: StudioRecording = {
  questionId: "question-1",
  question: "본인 경험을 설명해 주세요.",
  objectUrl: "blob:recorded-answer",
  mimeType: "video/webm",
  durationSeconds: 30,
};
const overlayLabel = "샘플 프레임의 실제 얼굴 기준점";

beforeEach(() => {
  vi.clearAllMocks();
  analysis.audio.mockResolvedValue(audioResult);
  analysis.vision.mockResolvedValue(visionResult);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    blob: async () => new Blob(["recorded media"], { type: "video/webm" }),
  }));
  const BrowserURL = URL;
  vi.stubGlobal("URL", class extends BrowserURL {
    static createObjectURL = vi.fn(() => "blob:studio-preview");
    static revokeObjectURL = vi.fn();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event("pause"));
  });
  // JSDOM cannot draw a canvas. These tests cover data lifecycle and playback
  // synchronization; actual pixels and model inference have separate checks.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function selectRecording(item = recording) {
  const view = render(<MediaAnalysisStudio recordings={[item]} />);
  fireEvent.click(screen.getByRole("button", { name: "답변 1" }));
  await screen.findByText(item.mimeType.startsWith("video/") ? "영상·음성" : "음성 전용");
  await openEvidence();
  const video = view.container.querySelector("video");
  if (!video) throw new Error("Expected replay element after selecting a recording");
  return { ...view, video };
}

async function openEvidence() {
  const summary = screen.getByText("녹화·음성 근거 확인");
  const details = summary.closest("details");
  if (!details) throw new Error("Expected evidence disclosure");
  if (!details.open) fireEvent.click(summary);
  await waitFor(() => expect(details.open).toBe(true));
  return details;
}

function loadMetadata(video: HTMLVideoElement, duration: number) {
  Object.defineProperties(video, {
    duration: { configurable: true, value: duration },
    videoWidth: { configurable: true, value: 1280 },
    videoHeight: { configurable: true, value: 720 },
  });
  fireEvent.loadedMetadata(video);
}

async function runVision() {
  fireEvent.click(screen.getByLabelText("선택한 영상을 기기 내 얼굴 기준점 검출에 사용하는 데 동의합니다."));
  fireEvent.click(screen.getByRole("button", { name: "영상 기준점 분석" }));
  await screen.findByRole("button", { name: "00:01 프레임 보기" });
}

describe("MediaAnalysisStudio real-data lifecycle", () => {
  it("uses plain Korean headings without decorative signal branding or icons", async () => {
    const { container } = await selectRecording({ ...recording, mimeType: "audio/webm" });
    expect(screen.getByRole("heading", { name: "면접 결과" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "답변 피드백" })).toBeTruthy();
    expect(screen.queryByText(/MOOA SIGNAL LAB|SIGNAL EXPLORER|EVIDENCE TIMELINE/)).toBeNull();
    expect(container.querySelector(".lucide-audio-lines, .lucide-activity, .lucide-fingerprint")).toBeNull();
    expect(screen.getByText("음성 재생")).toBeTruthy();
  });

  it("puts answer feedback before closed technical evidence and permits manual input without recordings", async () => {
    render(<MediaAnalysisStudio company="테스트 회사" role="개발" />);
    const feedback = screen.getByTestId("feedback-panel");
    const details = screen.getByText("녹화·음성 근거 확인").closest("details");
    expect(details?.open).toBe(false);
    expect(feedback.compareDocumentPosition(details!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(integration.feedback).toHaveBeenLastCalledWith(expect.objectContaining({ sourceBlob: null, sourceKey: null, initialQuestion: "", initialCompany: "테스트 회사", initialRole: "개발", disabledReason: undefined }));
    expect(analysis.audio).not.toHaveBeenCalled();
    expect(analysis.vision).not.toHaveBeenCalled();
  });

  it("passes the selected question and local recording to feedback, and opens evidence when seeking a quote", async () => {
    const { video } = await selectRecording(); loadMetadata(video, 30);
    expect(integration.feedback).toHaveBeenLastCalledWith(expect.objectContaining({ sourceBlob: expect.any(Blob), sourceKey: "blob:studio-preview", durationSeconds: 30, initialQuestion: recording.question, disabledReason: undefined }));
    const summary = screen.getByText("녹화·음성 근거 확인");
    const details = summary.closest("details");
    fireEvent.click(summary);
    await waitFor(() => expect(details?.open).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "5초 답변 근거 확인" }));
    await waitFor(() => expect(details?.open).toBe(true));
    expect(video.currentTime).toBe(5);
  });

  it("passes an explicit AI-disabled reason for diagnostic signals, never treating their title as a question", async () => {
    render(<MediaAnalysisStudio />); await openEvidence();
    fireEvent.click(screen.getByText("측정 방법과 한계"));
    fireEvent.click(screen.getByRole("button", { name: "측정 검증 신호" }));
    expect(integration.feedback).toHaveBeenLastCalledWith(expect.objectContaining({ sourceBlob: expect.any(Blob), initialQuestion: "", disabledReason: "검증 신호는 실제 면접 답변이 아니므로 AI 평가에 전송하지 않습니다." }));
    expect(analysis.audio).not.toHaveBeenCalled();
    expect(analysis.vision).not.toHaveBeenCalled();
  });

  it("runs replay landmark processing only with explicit consent and an open evidence section", async () => {
    await selectRecording();
    expect(integration.replay).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
    fireEvent.click(screen.getByLabelText(/재생 영상의 얼굴·신체 기준점 표시/));
    expect(integration.replay).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
    const summary = screen.getByText("녹화·음성 근거 확인");
    fireEvent.click(summary);
    await waitFor(() => expect(integration.replay).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false })));
  });

  it("does not fabricate measurements, graphs, events or overlays before analysis", async () => {
    const { video } = await selectRecording();
    loadMetadata(video, 30);
    expect(screen.getByText("분석 전에는 이벤트를 임의로 생성하지 않습니다.")).toBeTruthy();
    expect(screen.queryByRole("img", { name: "waveform 실제 측정 그래프" })).toBeNull();
    expect(screen.queryByLabelText(overlayLabel)).toBeNull();
    expect(screen.queryByRole("button", { name: /낮은 신호/ })).toBeNull();
    expect(analysis.audio).not.toHaveBeenCalled();
    expect(analysis.vision).not.toHaveBeenCalled();
  });

  it("preserves trusted recorder duration for unfinalized WebM metadata", async () => {
    const { video } = await selectRecording();
    loadMetadata(video, Infinity);
    expect(screen.getByText("00:00 / 00:30")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "음성 분석 시작" }));
    await screen.findByRole("img", { name: "waveform 실제 측정 그래프" });
    expect(analysis.audio).toHaveBeenCalledWith(expect.any(Blob), expect.any(AbortSignal), 30);
    await runVision();
    expect(analysis.vision).toHaveBeenCalledWith(expect.any(Blob), expect.objectContaining({ durationHintSeconds: 30 }));
  });

  it("keeps audio-only recordings out of face analysis, even if a fetched blob has a generic video container type", async () => {
    await selectRecording({ ...recording, mimeType: "audio/webm" });
    expect(screen.getByText("음성 전용")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("선택한 영상을 기기 내 얼굴 기준점 검출에 사용하는 데 동의합니다."));
    const visionButton = screen.getByRole("button", { name: "영상 기준점 분석" }) as HTMLButtonElement;
    expect(visionButton.disabled).toBe(true);
    fireEvent.click(visionButton);
    expect(analysis.vision).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "음성 분석 시작" }));
    await screen.findByRole("img", { name: "waveform 실제 측정 그래프" });
    expect(analysis.audio).toHaveBeenCalledTimes(1);
  });

  it("does not replace longer video duration with shorter decoded audio duration", async () => {
    const { video } = await selectRecording();
    loadMetadata(video, 45);
    fireEvent.click(screen.getByRole("button", { name: "음성 분석 시작" }));
    await screen.findByRole("img", { name: "waveform 실제 측정 그래프" });
    expect(audioResult.durationSeconds).toBe(2);
    expect(screen.getByText("00:00 / 00:45")).toBeTruthy();
    await runVision();
    expect(analysis.vision).toHaveBeenCalledWith(expect.any(Blob), expect.objectContaining({ durationHintSeconds: 45 }));
  });

  it("shows measured landmarks only paused at a completed sample seek, never during playback or seeking", async () => {
    const { video } = await selectRecording();
    loadMetadata(video, 30);
    await runVision();
    expect(screen.getByLabelText(overlayLabel).getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
    fireEvent.play(video);
    expect(screen.queryByLabelText(overlayLabel)).toBeNull();
    video.currentTime = 0.5;
    fireEvent.pause(video);
    expect(screen.queryByLabelText(overlayLabel)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "00:01 프레임 보기" }));
    expect(video.currentTime).toBe(1);
    expect(screen.queryByLabelText(overlayLabel)).toBeNull();
    fireEvent.seeked(video);
    expect(screen.getByLabelText(overlayLabel)).toBeTruthy();
    fireEvent.seeking(video);
    expect(screen.queryByLabelText(overlayLabel)).toBeNull();
    video.currentTime = 0.5;
    fireEvent.seeked(video);
    expect(screen.queryByLabelText(overlayLabel)).toBeNull();
  });

  it("aborts obsolete analysis and ignores its late result after the file is cleared", async () => {
    let complete: ((value: typeof audioResult) => void) | undefined;
    analysis.audio.mockImplementation(() => new Promise<typeof audioResult>((resolve) => { complete = resolve; }));
    await selectRecording();
    fireEvent.click(screen.getByRole("button", { name: "음성 분석 시작" }));
    await waitFor(() => expect(analysis.audio).toHaveBeenCalledTimes(1));
    const signal = analysis.audio.mock.calls[0][1] as AbortSignal;
    fireEvent.click(screen.getByRole("button", { name: "파일 해제" }));
    expect(signal.aborted).toBe(true);
    await act(async () => { complete?.(audioResult); });
    expect(screen.queryByRole("img", { name: "waveform 실제 측정 그래프" })).toBeNull();
    expect(screen.getByText("분석 전에는 이벤트를 임의로 생성하지 않습니다.")).toBeTruthy();
  });
});
