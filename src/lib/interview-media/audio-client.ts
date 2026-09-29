import { AUDIO_ANALYSIS_LIMITS, type InterviewAudioAnalysis } from "@/domain/interview-audio-analysis";
import { encodeMonoPcm16Wav } from "./audio-encoding";

export const MAX_MEDIA_BYTES = 80 * 1024 * 1024;
const DECODE_SAMPLE_RATE = 16_000;
// Native decodeAudioData cannot be interrupted. A canceled caller releases its
// UI promptly, but retains this queue slot until native decoding actually ends.
let decodeQueue: Promise<void> = Promise.resolve();

function withAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => signal.removeEventListener("abort", abort);
    const abort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(signal.reason ?? new DOMException("분석 취소", "AbortError"));
    };
    // Always observe operation rejection, including already-aborted callers.
    operation.then((value) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    }, (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    });
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

async function decodeInSequence(blob: Blob, signal: AbortSignal): Promise<AudioBuffer> {
  const previous = decodeQueue;
  let release: () => void = () => undefined;
  const reservation = new Promise<void>((resolve) => { release = resolve; });
  decodeQueue = previous.then(() => reservation);
  const operation = (async () => {
    try {
      await withAbort(previous, signal);
      signal.throwIfAborted();
      const bytes = await blob.arrayBuffer();
      // An abort during file reading must never start an expensive native decode.
      signal.throwIfAborted();
      let buffer: AudioBuffer;
      try {
        const context = new OfflineAudioContext(1, 1, DECODE_SAMPLE_RATE);
        buffer = await context.decodeAudioData(bytes);
      } catch {
        signal.throwIfAborted();
        throw new Error("이 브라우저가 음성을 해독하지 못했습니다. 오디오가 있는 WebM/MP4 또는 WAV 파일로 확인해 주세요.");
      }
      signal.throwIfAborted();
      return buffer;
    } finally {
      release();
    }
  })();
  return withAbort(operation, signal);
}

/**
 * durationSeconds must come from loaded media metadata or recording timing, not
 * a guessed fallback. This preflight reduces accidental oversized decodes; media
 * metadata can be malformed, so it is not a secure attestation of encoded length.
 * The native decoder still allocates before the post-decode limits can be checked.
 */
async function decodeSelectedAudio(blob: Blob, signal: AbortSignal, durationSeconds: number): Promise<{ samples: Float32Array; sampleRate: number }> {
  signal.throwIfAborted();
  if (!blob.size || blob.size > MAX_MEDIA_BYTES) throw new Error("비어 있지 않은 80MB 이하 파일을 선택해 주세요.");
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error("영상·음성 길이를 확인한 뒤 분석할 수 있습니다. 파일을 다시 불러와 주세요.");
  if (durationSeconds > AUDIO_ANALYSIS_LIMITS.maxDurationSeconds) throw new Error("한 번에 3분 이하의 답변을 분석할 수 있습니다.");
  const buffer = await decodeInSequence(blob, signal);
  signal.throwIfAborted();
  if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > AUDIO_ANALYSIS_LIMITS.maxDurationSeconds) {
    throw new Error("해독된 오디오가 유효한 3분 이하 파일이 아닙니다.");
  }
  if (!Number.isInteger(buffer.length) || buffer.length <= 0 || buffer.length > AUDIO_ANALYSIS_LIMITS.maxSamples ||
      !Number.isInteger(buffer.sampleRate) || buffer.sampleRate < AUDIO_ANALYSIS_LIMITS.minSampleRate || buffer.sampleRate > AUDIO_ANALYSIS_LIMITS.maxSampleRate ||
      buffer.length / buffer.sampleRate > AUDIO_ANALYSIS_LIMITS.maxDurationSeconds ||
      !Number.isInteger(buffer.numberOfChannels) || buffer.numberOfChannels < 1 || buffer.numberOfChannels > 8) {
    throw new Error("해독된 오디오의 샘플 수 또는 채널 구성이 지원 범위를 벗어났습니다.");
  }
  // Select highest-energy channel rather than mixing anti-phase stereo into silence.
  let channel = 0;
  let maxEnergy = -1;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const samples = buffer.getChannelData(c);
    if (samples.length !== buffer.length) throw new Error("오디오 채널 길이가 일치하지 않습니다.");
    let energy = 0;
    for (let i = 0; i < samples.length; i++) energy += samples[i] * samples[i];
    if (energy > maxEnergy) { maxEnergy = energy; channel = c; }
  }
  const samples = new Float32Array(buffer.getChannelData(channel));
  return { samples, sampleRate: buffer.sampleRate };
}

/** Re-encode audio only. Original video/container bytes never enter an AI request. */
export async function exportAudioForTranscription(blob: Blob, signal: AbortSignal, durationSeconds: number): Promise<Blob> {
  const { samples, sampleRate } = await decodeSelectedAudio(blob, signal, durationSeconds);
  signal.throwIfAborted();
  if (sampleRate !== DECODE_SAMPLE_RATE) throw new Error("음성 변환 샘플레이트를 확인하지 못했습니다.");
  return new Blob([encodeMonoPcm16Wav(samples, sampleRate)], { type: "audio/wav" });
}

export async function analyzeAudioBlob(blob: Blob, signal: AbortSignal, durationSeconds: number): Promise<InterviewAudioAnalysis> {
  const { samples, sampleRate } = await decodeSelectedAudio(blob, signal, durationSeconds);
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try { worker = new Worker(new URL("./audio-analysis.worker.ts", import.meta.url), { type: "module" }); }
    catch { reject(new Error("분석 작업을 실행하지 못했습니다. 새로고침 후 다시 시도하세요.")); return; }
    let settled = false;
    const finish = (): boolean => {
      if (settled) return false;
      settled = true;
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      signal.removeEventListener("abort", abort);
      clearTimeout(timer);
      return true;
    };
    const abort = () => { if (finish()) reject(signal.reason ?? new DOMException("분석 취소", "AbortError")); };
    const timer = setTimeout(() => { if (finish()) reject(new Error("분석 시간이 초과됐습니다. 더 짧은 파일로 다시 시도하세요.")); }, 60000);
    worker.onmessage = (event: MessageEvent<{ ok: boolean; result: InterviewAudioAnalysis; error?: string }>) => {
      if (!finish()) return;
      if (event.data.ok) resolve(event.data.result); else reject(new Error(event.data.error ?? "분석 실패"));
    };
    worker.onerror = () => { if (finish()) reject(new Error("분석 작업을 실행하지 못했습니다. 새로고침 후 다시 시도하세요.")); };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) { abort(); return; }
    try { worker.postMessage({ samples, sampleRate }, [samples.buffer]); }
    catch { if (finish()) reject(new Error("분석 작업에 오디오를 전달하지 못했습니다.")); }
  });
}

/** Diagnostic calibration, never presented as a person's interview. */
export function createCalibrationWav(): Blob {
  const rate = 16000;
  const length = rate * 8;
  const bytes = new ArrayBuffer(44 + length * 2);
  const view = new DataView(bytes);
  const str = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  str(0, "RIFF"); view.setUint32(4, 36 + length * 2, true); str(8, "WAVE"); str(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  str(36, "data"); view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) {
    const t = i / rate;
    const sample = t < 2 ? .25 * Math.sin(2 * Math.PI * 160 * t) : t < 3 ? 0 : t < 5 ? .5 * Math.sin(2 * Math.PI * 240 * t) : t < 6 ? 0 : Math.max(-1, Math.min(1, 1.3 * Math.sin(2 * Math.PI * 200 * t)));
    view.setInt16(44 + 2 * i, Math.round(sample * 32767), true);
  }
  return new Blob([bytes], { type: "audio/wav" });
}
