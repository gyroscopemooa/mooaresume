// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ decode: vi.fn() }));
vi.mock("./audio-client", () => ({ decodeAudioForLocalTranscription: mocks.decode }));

import { transcribeInterviewLocally } from "./local-transcription";

type Handler = ((event: MessageEvent) => void) | null;

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: Handler = null;
  onerror: ((event: Event) => void) | null = null;
  terminated = false;
  messages: unknown[] = [];

  constructor(public url: string | URL, public options?: WorkerOptions) {
    FakeWorker.instances.push(this);
  }

  postMessage(message: { type: string; quality?: string }) {
    this.messages.push(message);
    if (message.type !== "load") return;
    queueMicrotask(() => {
      if (message.quality === "next") this.onmessage?.({ data: { type: "error", text: "WebGPU unavailable" } } as MessageEvent);
      else if (message.quality === "high") {
        this.onmessage?.({ data: { type: "engine", model: "whisper-large-v3-turbo" } } as MessageEvent);
        this.onmessage?.({ data: { type: "ready" } } as MessageEvent);
        queueMicrotask(() => this.onmessage?.({ data: { type: "text", text: "  실제 음성 답변입니다.  " } } as MessageEvent));
      }
    });
  }

  terminate() { this.terminated = true; }
}

describe("transcribeInterviewLocally", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FakeWorker.instances = [];
    mocks.decode.mockResolvedValue(new Float32Array([0.1, -0.1]));
    vi.stubGlobal("Worker", FakeWorker);
  });

  it("falls back from Cohere to Whisper Turbo without sending audio to a server", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const states: string[] = [];
    const result = await transcribeInterviewLocally(
      new Blob(["recording"]),
      5,
      new AbortController().signal,
      (state) => states.push(state.phase),
    );

    expect(result).toEqual({ text: "실제 음성 답변입니다.", model: "whisper-large-v3-turbo", fallback: true });
    expect(FakeWorker.instances).toHaveLength(2);
    expect(FakeWorker.instances.every((worker) => worker.terminated)).toBe(true);
    expect(states).toContain("fallback");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("stops before creating a worker when already canceled", async () => {
    const controller = new AbortController();
    controller.abort();
    mocks.decode.mockRejectedValue(controller.signal.reason);

    await expect(transcribeInterviewLocally(new Blob(["recording"]), 5, controller.signal, vi.fn())).rejects.toBeTruthy();
    expect(FakeWorker.instances).toHaveLength(0);
  });
});
