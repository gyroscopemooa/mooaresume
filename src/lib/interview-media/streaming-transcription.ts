type WorkerMessage = { type: "progress" | "engine" | "warming" | "ready" | "text" | "error"; text?: string };

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let resolveReady: (() => void) | null = null;
let rejectReady: ((error: Error) => void) | null = null;
let activeResolve: ((text: string) => void) | null = null;
let activeReject: ((error: Error) => void) | null = null;
let chain = Promise.resolve();
const CHUNK_SECONDS = 4;
const OVERLAP_SECONDS = 0.5;
const MIN_SIGNAL_DBFS = -48;

function ensureWorker(): Promise<void> {
  if (ready) return ready;
  ready = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  worker = new Worker("/interview-analysis/local-stt-worker.js?v=2", { type: "module" });
  worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
    if (data.type === "ready") { resolveReady?.(); resolveReady = null; rejectReady = null; }
    if (data.type === "text") { activeResolve?.(data.text?.trim() ?? ""); activeResolve = null; activeReject = null; }
    if (data.type === "error") {
      const error = new Error(data.text || "실시간 로컬 받아쓰기에 실패했습니다.");
      if (resolveReady) { rejectReady?.(error); resolveReady = null; rejectReady = null; }
      else { activeReject?.(error); activeResolve = null; activeReject = null; }
    }
  };
  worker.onerror = () => {
    const error = new Error("실시간 로컬 받아쓰기 작업자를 실행하지 못했습니다.");
    rejectReady?.(error); activeReject?.(error);
    resolveReady = null; rejectReady = null; activeResolve = null; activeReject = null;
    worker?.terminate(); worker = null; ready = null;
  };
  worker.postMessage({ type: "load", quality: "next" });
  return ready;
}

export function prewarmStreamingTranscription(): void {
  void ensureWorker().catch(() => undefined);
}

function transcribeChunk(samples: Float32Array): Promise<string> {
  const task = chain.catch(() => undefined).then(async () => {
    await ensureWorker();
    return new Promise<string>((resolve, reject) => {
      activeResolve = resolve; activeReject = reject;
      const copy = new Float32Array(samples);
      worker?.postMessage({ type: "audio", audio: copy }, [copy.buffer]);
    });
  });
  chain = task.then(() => undefined, () => undefined);
  return task;
}

function resample(input: Float32Array, sourceRate: number): Float32Array {
  if (sourceRate === 16_000) return input;
  const ratio = sourceRate / 16_000;
  const output = new Float32Array(Math.max(1, Math.floor(input.length / ratio)));
  for (let index = 0; index < output.length; index++) {
    const start = Math.floor(index * ratio);
    const end = Math.min(input.length, Math.floor((index + 1) * ratio));
    let sum = 0;
    for (let source = start; source < end; source++) sum += input[source];
    output[index] = sum / Math.max(1, end - start);
  }
  return output;
}

export function signalDbfs(samples: Float32Array): number {
  if (!samples.length) return -100;
  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  const rms = Math.sqrt(energy / samples.length);
  return rms > 0 ? Math.max(-100, 20 * Math.log10(rms)) : -100;
}

export function hasTranscribableSignal(samples: Float32Array): boolean {
  return samples.length >= 1_600 && signalDbfs(samples) >= MIN_SIGNAL_DBFS;
}

const normalizedToken = (value: string) => value.toLocaleLowerCase("ko-KR").replace(/[^0-9a-z가-힣]/gu, "");

/** Merge repeated words created by overlapping streaming chunks without rewriting either transcript. */
export function mergeOverlappingTranscript(current: string, next: string): string {
  const left = current.trim();
  const right = next.trim();
  if (!left) return right;
  if (!right) return left;
  const leftTokens = left.split(/\s+/u);
  const rightTokens = right.split(/\s+/u);
  const limit = Math.min(12, leftTokens.length, rightTokens.length);
  for (let size = limit; size >= 1; size--) {
    const suffix = leftTokens.slice(-size).map(normalizedToken);
    const prefix = rightTokens.slice(0, size).map(normalizedToken);
    if (suffix.every((token, index) => token && token === prefix[index])) {
      return `${left} ${rightTokens.slice(size).join(" ")}`.trim();
    }
  }
  return `${left} ${right}`;
}

function joinSamples(parts: readonly Float32Array[], length: number): Float32Array {
  const merged = new Float32Array(length);
  let offset = 0;
  for (const part of parts) { merged.set(part, offset); offset += part.length; }
  return merged;
}

export type StreamingTranscriptionSession = {
  finish(): Promise<string>;
  abort(): void;
};

export function startStreamingTranscription(stream: MediaStream, onText: (text: string) => void): StreamingTranscriptionSession | null {
  if (typeof AudioContext === "undefined") return null;
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const silent = context.createGain(); silent.gain.value = 0;
  const chunks: Float32Array[] = [];
  const finalChunks: Float32Array[] = [];
  let sampleCount = 0;
  let finalSampleCount = 0;
  let overlap = new Float32Array(0);
  let stopped = false;
  let transcript = "";
  const pending: Promise<void>[] = [];

  const flush = () => {
    if (!sampleCount) return;
    const merged = joinSamples(chunks.splice(0), sampleCount);
    sampleCount = 0;
    const withOverlap = joinSamples([overlap, merged], overlap.length + merged.length);
    overlap = merged.slice(Math.max(0, merged.length - Math.round(context.sampleRate * OVERLAP_SECONDS)));
    const prepared = resample(withOverlap, context.sampleRate);
    if (!hasTranscribableSignal(prepared)) return;
    const work = transcribeChunk(prepared).then((text) => {
      if (!text || stopped) return;
      transcript = mergeOverlappingTranscript(transcript, text);
      onText(transcript);
    }).catch(() => undefined);
    pending.push(work);
  };
  processor.onaudioprocess = (event) => {
    if (stopped) return;
    const copy = new Float32Array(event.inputBuffer.getChannelData(0));
    const finalCopy = resample(copy, context.sampleRate);
    finalChunks.push(finalCopy); finalSampleCount += finalCopy.length;
    chunks.push(copy); sampleCount += copy.length;
    if (sampleCount >= context.sampleRate * CHUNK_SECONDS) flush();
  };
  source.connect(processor); processor.connect(silent); silent.connect(context.destination);
  void context.resume().catch(() => undefined);
  prewarmStreamingTranscription();

  const close = () => {
    processor.onaudioprocess = null; processor.disconnect(); source.disconnect(); silent.disconnect();
    void context.close().catch(() => undefined);
  };
  return {
    async finish() {
      if (stopped) return transcript;
      processor.onaudioprocess = null;
      flush();
      close();
      await Promise.all(pending);
      const completeAudio = joinSamples(finalChunks, finalSampleCount);
      if (hasTranscribableSignal(completeAudio)) {
        try {
          const finalText = (await transcribeChunk(completeAudio)).trim();
          if (finalText) { transcript = finalText; onText(transcript); }
        } catch { /* Keep the best streaming transcript when final refinement fails. */ }
      }
      stopped = true;
      return transcript;
    },
    abort() { if (stopped) return; stopped = true; chunks.length = 0; finalChunks.length = 0; sampleCount = 0; finalSampleCount = 0; overlap = new Float32Array(0); close(); },
  };
}
