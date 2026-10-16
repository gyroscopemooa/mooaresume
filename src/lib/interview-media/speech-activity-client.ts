import type { AudioSignalInterval, InterviewAudioAnalysis } from "@/domain/interview-audio-analysis";

const ASSET_ROOT = "/interview-analysis/vad";
let detector: Promise<import("@ricky0123/vad-web").NonRealTimeVAD> | null = null;

async function getDetector() {
  detector ??= import("@ricky0123/vad-web").then(({ NonRealTimeVAD }) => NonRealTimeVAD.new({
    modelURL: `${ASSET_ROOT}/silero_vad_legacy.onnx`,
    positiveSpeechThreshold: .6,
    negativeSpeechThreshold: .35,
    redemptionMs: 500,
    preSpeechPadMs: 200,
    minSpeechMs: 250,
    ortConfig: (ort) => {
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = {
        wasm: `${ASSET_ROOT}/ort-wasm-simd-threaded.wasm`,
        mjs: `${ASSET_ROOT}/ort-wasm-simd-threaded.mjs`,
      };
    },
  })).catch((error) => { detector = null; throw error; });
  return detector;
}

function pausesBetween(intervals: readonly AudioSignalInterval[]): AudioSignalInterval[] {
  const pauses: AudioSignalInterval[] = [];
  for (let index = 1; index < intervals.length; index++) {
    const startSeconds = intervals[index - 1].endSeconds;
    const endSeconds = intervals[index].startSeconds;
    if (endSeconds - startSeconds >= .8) pauses.push({ startSeconds, endSeconds });
  }
  return pauses;
}

/** Local model inference. Audio samples never leave the browser. */
export async function analyzeSpeechActivity(samples: Float32Array, sampleRate: number, signal: AbortSignal): Promise<NonNullable<InterviewAudioAnalysis["speechActivity"]>> {
  signal.throwIfAborted();
  const vad = await getDetector();
  signal.throwIfAborted();
  const speechIntervals: AudioSignalInterval[] = [];
  for await (const segment of vad.run(samples, sampleRate)) {
    signal.throwIfAborted();
    const startSeconds = Math.max(0, segment.start / 1000);
    const endSeconds = Math.min(samples.length / sampleRate, segment.end / 1000);
    if (endSeconds > startSeconds) speechIntervals.push({ startSeconds, endSeconds });
  }
  return {
    engine: "Silero VAD legacy / local ONNX",
    speechIntervals,
    pauseIntervals: pausesBetween(speechIntervals),
    speechSeconds: speechIntervals.reduce((total, interval) => total + interval.endSeconds - interval.startSeconds, 0),
  };
}
