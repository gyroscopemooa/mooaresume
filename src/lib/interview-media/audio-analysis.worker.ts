import { analyzeInterviewAudio } from "@/domain/interview-audio-analysis";

// Keep DOM and worker lib declarations separate in the shared Next TS project.
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<{ samples: Float32Array; sampleRate: number }>) => void) | null;
  postMessage: (message: unknown) => void;
};
scope.onmessage = (event) => {
  try { scope.postMessage({ ok: true, result: analyzeInterviewAudio(event.data.samples, event.data.sampleRate) }); }
  catch (error) { scope.postMessage({ ok: false, error: error instanceof Error ? error.message : "음성 계산 실패" }); }
};
