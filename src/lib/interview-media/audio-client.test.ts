import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeInterviewAudio, type InterviewAudioAnalysis } from "@/domain/interview-audio-analysis";
import { analyzeAudioBlob, createCalibrationWav, exportAudioForTranscription } from "@/lib/interview-media/audio-client";
import { encodeMonoPcm16Wav } from "@/lib/interview-media/audio-encoding";

const RATE = 16_000;
const result = analyzeInterviewAudio(new Float32Array(16), RATE);
const createContext = vi.fn();
const decode = vi.fn<(data: ArrayBuffer) => Promise<AudioBuffer>>();
let autoWorkerReply = true;
let throwOnPost = false;
const workers: WorkerStub[] = [];

function buffer(channels = [new Float32Array(1600)], duration = 0.1): AudioBuffer {
  return {
    duration,
    length: channels[0].length,
    sampleRate: RATE,
    numberOfChannels: channels.length,
    getChannelData: (index: number) => channels[index],
  } as AudioBuffer;
}

class ContextStub {
  constructor(...args: unknown[]) { createContext(...args); }
  decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer> { return decode(data); }
}

class WorkerStub {
  onmessage: ((event: { data: { ok: boolean; result: InterviewAudioAnalysis } }) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn((message: { samples: Float32Array; sampleRate: number }) => {
    if (throwOnPost) throw new Error("post failed");
    if (autoWorkerReply) queueMicrotask(() => this.onmessage?.({ data: { ok: true, result } }));
    return message;
  });
  constructor() { workers.push(this); }
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void } {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function flush(): Promise<void> {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}

beforeEach(() => {
  createContext.mockReset();
  decode.mockReset().mockResolvedValue(buffer());
  autoWorkerReply = true;
  throwOnPost = false;
  workers.length = 0;
  vi.stubGlobal("OfflineAudioContext", ContextStub);
  vi.stubGlobal("Worker", WorkerStub);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("audio browser client resource and cancellation boundaries", () => {
  it.each([NaN, Infinity, 0, -1, 180.01])("rejects unknown or excessive duration %s before reading or decoding", async (duration) => {
    const blob = new Blob(["audio"]);
    const read = vi.spyOn(blob, "arrayBuffer");
    await expect(analyzeAudioBlob(blob, new AbortController().signal, duration)).rejects.toThrow();
    expect(read).not.toHaveBeenCalled();
    expect(createContext).not.toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
    expect(workers).toHaveLength(0);
  });

  it("rejects empty and oversized blobs before allocating native audio resources", async () => {
    await expect(analyzeAudioBlob(new Blob(), new AbortController().signal, 1)).rejects.toThrow("80MB");
    const blob = new Blob(["audio"]);
    vi.spyOn(blob, "size", "get").mockReturnValue(80 * 1024 * 1024 + 1);
    await expect(analyzeAudioBlob(blob, new AbortController().signal, 1)).rejects.toThrow("80MB");
    expect(createContext).not.toHaveBeenCalled();
  });

  it("does not start decode if canceled while reading file bytes", async () => {
    const blob = new Blob(["audio"]);
    const bytes = deferred<ArrayBuffer>();
    const read = vi.spyOn(blob, "arrayBuffer").mockReturnValue(bytes.promise);
    const controller = new AbortController();
    const request = analyzeAudioBlob(blob, controller.signal, 1);
    const rejection = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
    controller.abort();
    await rejection;
    bytes.resolve(new ArrayBuffer(4));
    await flush();
    expect(createContext).not.toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
  });

  it("keeps canceled native decoding serialized before allowing retry", async () => {
    const native = deferred<AudioBuffer>();
    decode.mockReturnValueOnce(native.promise);
    const controller = new AbortController();
    const first = analyzeAudioBlob(new Blob(["one"]), controller.signal, 1);
    const rejection = expect(first).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
    controller.abort();
    await rejection;
    const secondBlob = new Blob(["two"]);
    const secondRead = vi.spyOn(secondBlob, "arrayBuffer");
    const second = analyzeAudioBlob(secondBlob, new AbortController().signal, 1);
    await flush();
    expect(decode).toHaveBeenCalledTimes(1);
    expect(secondRead).not.toHaveBeenCalled();
    native.resolve(buffer());
    await expect(second).resolves.toEqual(result);
    expect(decode).toHaveBeenCalledTimes(2);
    expect(workers).toHaveLength(1);
  });

  it("can cancel a queued retry without blocking later requests", async () => {
    const native = deferred<AudioBuffer>();
    decode.mockReturnValueOnce(native.promise);
    const first = analyzeAudioBlob(new Blob(["one"]), new AbortController().signal, 1);
    await vi.waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
    const queuedController = new AbortController();
    const queuedBlob = new Blob(["two"]);
    const queuedRead = vi.spyOn(queuedBlob, "arrayBuffer");
    const queued = analyzeAudioBlob(queuedBlob, queuedController.signal, 1);
    const rejection = expect(queued).rejects.toMatchObject({ name: "AbortError" });
    queuedController.abort();
    await rejection;
    const third = analyzeAudioBlob(new Blob(["three"]), new AbortController().signal, 1);
    native.resolve(buffer());
    await Promise.all([first, third]);
    expect(queuedRead).not.toHaveBeenCalled();
    expect(decode).toHaveBeenCalledTimes(2);
  });

  it("releases the serialization slot after decode failure", async () => {
    decode.mockRejectedValueOnce(new Error("bad codec"));
    await expect(analyzeAudioBlob(new Blob(["one"]), new AbortController().signal, 1)).rejects.toThrow("해독");
    await expect(analyzeAudioBlob(new Blob(["two"]), new AbortController().signal, 1)).resolves.toEqual(result);
    expect(decode).toHaveBeenCalledTimes(2);
  });

  it("checks decoded duration again and never copies excessive PCM into a worker", async () => {
    decode.mockResolvedValueOnce(buffer([new Float32Array(16)], 181));
    await expect(analyzeAudioBlob(new Blob(["audio"]), new AbortController().signal, 1)).rejects.toThrow("3분");
    expect(workers).toHaveLength(0);
  });

  it("selects the highest-energy real channel and cleans up successful workers", async () => {
    const quiet = new Float32Array(1600).fill(0.1);
    const loud = new Float32Array(1600).fill(-0.5);
    decode.mockResolvedValueOnce(buffer([quiet, loud]));
    await expect(analyzeAudioBlob(new Blob(["audio"]), new AbortController().signal, 1)).resolves.toEqual(result);
    expect(createContext).toHaveBeenCalledWith(1, 1, RATE);
    const sent = workers[0].postMessage.mock.calls[0][0];
    expect(sent.samples).toEqual(loud);
    expect(sent.samples).not.toBe(loud);
    expect(sent.sampleRate).toBe(RATE);
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(workers[0].onmessage).toBeNull();
  });

  it("terminates active analysis immediately when canceled", async () => {
    autoWorkerReply = false;
    const controller = new AbortController();
    const request = analyzeAudioBlob(new Blob(["audio"]), controller.signal, 1);
    const rejection = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(workers).toHaveLength(1));
    controller.abort();
    await rejection;
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(workers[0].onmessage).toBeNull();
  });

  it("cleans up workers when message transfer fails", async () => {
    throwOnPost = true;
    await expect(analyzeAudioBlob(new Blob(["audio"]), new AbortController().signal, 1)).rejects.toThrow("전달");
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(workers[0].onerror).toBeNull();
  });
});

describe("explicit synthetic calibration WAV", () => {
  it("writes a correct 8 second mono 16 kHz PCM16 header and known signal segments", async () => {
    const wav = createCalibrationWav();
    expect(wav.type).toBe("audio/wav");
    const bytes = await wav.arrayBuffer();
    const data = new DataView(bytes);
    const tag = (offset: number, size: number) => String.fromCharCode(...new Uint8Array(bytes, offset, size));
    expect(tag(0, 4)).toBe("RIFF");
    expect(tag(8, 4)).toBe("WAVE");
    expect(tag(12, 4)).toBe("fmt ");
    expect(tag(36, 4)).toBe("data");
    expect(data.getUint32(4, true)).toBe(bytes.byteLength - 8);
    expect(data.getUint16(20, true)).toBe(1);
    expect(data.getUint16(22, true)).toBe(1);
    expect(data.getUint32(24, true)).toBe(RATE);
    expect(data.getUint32(28, true)).toBe(RATE * 2);
    expect(data.getUint16(32, true)).toBe(2);
    expect(data.getUint16(34, true)).toBe(16);
    expect(data.getUint32(40, true)).toBe(8 * RATE * 2);
    const samples = Float32Array.from({ length: 8 * RATE }, (_, index) => data.getInt16(44 + index * 2, true) / 32767);
    const first = analyzeInterviewAudio(samples.subarray(0, 2 * RATE), RATE);
    const quiet = analyzeInterviewAudio(samples.subarray(2 * RATE, 3 * RATE), RATE);
    const second = analyzeInterviewAudio(samples.subarray(3 * RATE, 5 * RATE), RATE);
    const saturated = analyzeInterviewAudio(samples.subarray(6 * RATE), RATE);
    expect(first.summary.pitchMedianHz).toBeCloseTo(160, 0);
    expect(first.summary.peakDbfs).toBeCloseTo(20 * Math.log10(0.25), 2);
    expect(quiet.summary.rmsDbfs).toBe(-100);
    expect(second.summary.pitchMedianHz).toBeCloseTo(240, 0);
    expect(second.summary.peakDbfs).toBeCloseTo(20 * Math.log10(0.5), 2);
    expect(saturated.summary.nearFullScaleFraction).toBeGreaterThan(0.3);
    expect(saturated.summary.peakDbfs).toBe(0);
  });
});

describe("audio-only transcription export privacy boundary", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });

  it("returns a new mono 16 kHz PCM16 WAV without source video/container metadata or network traffic", async () => {
    const source = new Blob(["PRIVATE_VIDEO_CONTAINER_METADATA_AND_VISUAL_FRAMES"], { type: "video/mp4" });
    const samples = new Float32Array([0, .25, -.5, 1, -1]);
    decode.mockResolvedValueOnce(buffer([samples], samples.length / RATE));
    const wav = await exportAudioForTranscription(source, new AbortController().signal, 1);
    const bytes = await wav.arrayBuffer();
    const view = new DataView(bytes);
    const tag = (offset: number, length: number) => String.fromCharCode(...new Uint8Array(bytes, offset, length));
    expect(wav).not.toBe(source);
    expect(wav.type).toBe("audio/wav");
    expect(bytes.byteLength).toBe(44 + samples.length * 2);
    expect(tag(0, 4)).toBe("RIFF");
    expect(tag(8, 4)).toBe("WAVE");
    expect(tag(12, 4)).toBe("fmt ");
    expect(tag(36, 4)).toBe("data");
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint32(28, true)).toBe(32_000);
    expect(view.getUint16(32, true)).toBe(2);
    expect(view.getUint16(34, true)).toBe(16);
    expect(Array.from({ length: samples.length }, (_, i) => view.getInt16(44 + i * 2, true))).toEqual([0, 8192, -16384, 32767, -32768]);
    expect(new TextDecoder().decode(bytes)).not.toContain("PRIVATE_VIDEO_CONTAINER");
    expect(createContext).toHaveBeenCalledWith(1, 1, RATE);
    expect(fetch).not.toHaveBeenCalled();
    expect(workers).toHaveLength(0);
  });

  it("exports only the highest-energy decoded channel, without averaging antiphase channels", async () => {
    const quiet = new Float32Array([.1, -.1, .1, -.1]);
    const loud = new Float32Array([-.5, .5, -.5, .5]);
    decode.mockResolvedValueOnce(buffer([quiet, loud], loud.length / RATE));
    const wav = await exportAudioForTranscription(new Blob(["video bytes"], { type: "video/webm" }), new AbortController().signal, 1);
    const view = new DataView(await wav.arrayBuffer());
    expect(Array.from({ length: loud.length }, (_, i) => view.getInt16(44 + i * 2, true))).toEqual([-16384, 16384, -16384, 16384]);
    expect(loud).toEqual(new Float32Array([-.5, .5, -.5, .5]));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a pre-aborted export before reading, decoding, or any transfer", async () => {
    const source = new Blob(["video bytes"], { type: "video/mp4" });
    const read = vi.spyOn(source, "arrayBuffer");
    const controller = new AbortController(); controller.abort();
    await expect(exportAudioForTranscription(source, controller.signal, 1)).rejects.toMatchObject({ name: "AbortError" });
    expect(read).not.toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects oversize or over-duration inputs before decoding or transfer", async () => {
    const source = new Blob(["video bytes"], { type: "video/mp4" });
    const read = vi.spyOn(source, "arrayBuffer");
    vi.spyOn(source, "size", "get").mockReturnValue(80 * 1024 * 1024 + 1);
    await expect(exportAudioForTranscription(source, new AbortController().signal, 1)).rejects.toThrow("80MB");
    await expect(exportAudioForTranscription(new Blob(["video bytes"]), new AbortController().signal, 181)).rejects.toThrow("3분");
    expect(read).not.toHaveBeenCalled();
    expect(createContext).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never returns a WAV or transfers late native decode output after cancellation", async () => {
    const native = deferred<AudioBuffer>(); decode.mockReturnValueOnce(native.promise);
    const controller = new AbortController();
    const request = exportAudioForTranscription(new Blob(["video bytes"]), controller.signal, 1);
    const rejection = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(decode).toHaveBeenCalledOnce());
    controller.abort(); await rejection;
    native.resolve(buffer()); await flush();
    expect(fetch).not.toHaveBeenCalled();
    expect(workers).toHaveLength(0);
    // Cancellation releases the decode queue once the native operation settles.
    await expect(exportAudioForTranscription(new Blob(["retry"]), new AbortController().signal, 1)).resolves.toMatchObject({ type: "audio/wav" });
  });

  it("rejects a decoder that does not return the requested 16 kHz, never relabeling data", async () => {
    decode.mockResolvedValueOnce({ ...buffer(), sampleRate: 48_000 } as AudioBuffer);
    await expect(exportAudioForTranscription(new Blob(["video bytes"]), new AbortController().signal, 1)).rejects.toThrow("샘플레이트");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects malformed decoded channels or excessive duration before a WAV can be returned", async () => {
    decode.mockResolvedValueOnce(buffer([new Float32Array(16)], 181));
    await expect(exportAudioForTranscription(new Blob(["video bytes"]), new AbortController().signal, 1)).rejects.toThrow("3분");
    decode.mockResolvedValueOnce(buffer([new Float32Array(16), new Float32Array(15)], .001));
    await expect(exportAudioForTranscription(new Blob(["video bytes"]), new AbortController().signal, 1)).rejects.toThrow("채널 길이");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("encodes only finite PCM, clips out-of-range amplitude, and rejects wrong export lengths/rates", () => {
    const data = new DataView(encodeMonoPcm16Wav(new Float32Array([-2, 2]), RATE));
    expect(data.getInt16(44, true)).toBe(-32768);
    expect(data.getInt16(46, true)).toBe(32767);
    expect(() => encodeMonoPcm16Wav(new Float32Array([NaN]), RATE)).toThrow("유효하지 않은");
    expect(() => encodeMonoPcm16Wav(new Float32Array([Infinity]), RATE)).toThrow("유효하지 않은");
    expect(() => encodeMonoPcm16Wav(new Float32Array(0), RATE)).toThrow();
    expect(() => encodeMonoPcm16Wav(new Float32Array(1), 48_000)).toThrow();
    expect(() => encodeMonoPcm16Wav(new Float32Array(RATE * 180 + 1), RATE)).toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
