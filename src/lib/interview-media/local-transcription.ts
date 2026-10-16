import { decodeAudioForLocalTranscription } from "./audio-client";

export type LocalTranscriptionState = {
  phase: "decoding" | "downloading" | "warming" | "transcribing" | "fallback" | "complete";
  text: string;
  percent?: number;
};

export type LocalTranscriptionResult = {
  text: string;
  model: "cohere-transcribe" | "whisper-large-v3-turbo" | "whisper-base";
  fallback: boolean;
};

type WorkerMessage = {
  type: "progress" | "engine" | "warming" | "ready" | "text" | "error";
  percent?: number;
  model?: LocalTranscriptionResult["model"];
  text?: string;
  phase?: string;
};

const labels: Record<LocalTranscriptionResult["model"], string> = {
  "cohere-transcribe": "Cohere Transcribe",
  "whisper-large-v3-turbo": "Whisper Turbo",
  "whisper-base": "Whisper Base",
};

const presets = ["next", "high", "light"] as const;

function runWorker(
  samples: Float32Array,
  preset: typeof presets[number],
  signal: AbortSignal,
  onState: (state: LocalTranscriptionState) => void,
): Promise<{ text: string; model: LocalTranscriptionResult["model"] }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker("/interview-analysis/local-stt-worker.js?v=1", { type: "module" });
    let model: LocalTranscriptionResult["model"] = preset === "next" ? "cohere-transcribe" : preset === "high" ? "whisper-large-v3-turbo" : "whisper-base";
    let settled = false;
    const finish = () => {
      if (settled) return false;
      settled = true;
      worker.terminate();
      signal.removeEventListener("abort", abort);
      clearTimeout(timer);
      return true;
    };
    const abort = () => { if (finish()) reject(signal.reason ?? new DOMException("받아쓰기 취소", "AbortError")); };
    const timer = window.setTimeout(() => { if (finish()) reject(new Error("로컬 음성 모델 준비 시간이 초과됐습니다.")); }, 10 * 60_000);
    worker.onerror = () => { if (finish()) reject(new Error("로컬 음성 모델 작업자를 실행하지 못했습니다.")); };
    worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
      if (data.type === "progress") onState({ phase: "downloading", percent: data.percent, text: `${labels[model]} 준비${data.percent === undefined ? " 중" : ` ${data.percent}%`}` });
      if (data.type === "engine" && data.model) model = data.model;
      if (data.type === "warming") onState({ phase: "warming", text: `${labels[model]} 첫 실행 준비 중` });
      if (data.type === "ready") {
        onState({ phase: "transcribing", text: `${labels[model]}로 녹음 답변을 받아쓰는 중` });
        const copy = new Float32Array(samples);
        worker.postMessage({ type: "audio", audio: copy }, [copy.buffer]);
      }
      if (data.type === "text") {
        if (!finish()) return;
        resolve({ text: data.text?.trim() ?? "", model });
      }
      if (data.type === "error" && finish()) reject(new Error(data.text || "로컬 받아쓰기에 실패했습니다."));
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) { abort(); return; }
    worker.postMessage({ type: "load", quality: preset });
  });
}

/** Downloads model/runtime only. Decoded interview audio remains in this browser. */
export async function transcribeInterviewLocally(
  blob: Blob,
  durationSeconds: number,
  signal: AbortSignal,
  onState: (state: LocalTranscriptionState) => void,
): Promise<LocalTranscriptionResult> {
  onState({ phase: "decoding", text: "녹음에서 음성만 준비하는 중" });
  const samples = await decodeAudioForLocalTranscription(blob, signal, durationSeconds);
  let lastError: unknown;
  for (let index = 0; index < presets.length; index++) {
    signal.throwIfAborted();
    if (index > 0) onState({ phase: "fallback", text: "이 장치에서 상위 엔진을 실행하지 못해 다음 로컬 엔진으로 전환합니다." });
    try {
      const result = await runWorker(samples, presets[index], signal, onState);
      if (!result.text) throw new Error("인식된 답변이 없습니다. 마이크 녹음과 음량을 확인해 주세요.");
      return { ...result, fallback: index > 0 };
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("로컬 받아쓰기에 실패했습니다.");
}
