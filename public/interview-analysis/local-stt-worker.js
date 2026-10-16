// Adapted from the user's local TranStream Edu worker. Audio never leaves this
// browser; transformers.js and model weights are downloaded and browser-cached.
let recognizer;
let engine = "light";
const files = new Map();

const engines = {
  light: { model: "whisper-base", gpu: false },
  high: { model: "whisper-large-v3-turbo", gpu: true },
  next: { model: "cohere-transcribe", gpu: true },
};

const progress = (item) => {
  if (item.status === "progress" && item.file) files.set(item.file, { loaded: item.loaded || 0, total: item.total || 0 });
  if (item.status === "done" && item.file && files.has(item.file)) {
    const file = files.get(item.file);
    files.set(item.file, { loaded: file.total, total: file.total });
  }
  let loaded = 0;
  let total = 0;
  for (const file of files.values()) { loaded += file.loaded; total += file.total; }
  self.postMessage({ type: "progress", percent: total > 5e6 ? Math.min(100, Math.round((loaded / total) * 100)) : undefined });
};

async function load(pipeline, preset, adapter) {
  files.clear();
  const f16 = adapter?.features?.has("shader-f16");
  if (preset === "next") {
    return pipeline("automatic-speech-recognition", "onnx-community/cohere-transcribe-03-2026-ONNX", {
      device: "webgpu", dtype: f16 ? "q4f16" : "q4", progress_callback: progress,
    });
  }
  const high = preset === "high";
  return pipeline("automatic-speech-recognition", high ? "onnx-community/whisper-large-v3-turbo" : "onnx-community/whisper-base", {
    device: high ? "webgpu" : "wasm",
    dtype: high ? { encoder_model: f16 ? "fp16" : "fp32", decoder_model_merged: "q4" } : "q8",
    progress_callback: progress,
  });
}

self.onmessage = async ({ data }) => {
  if (data.type === "load") {
    try {
      const { pipeline, env } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js");
      env.allowLocalModels = false;
      env.backends.onnx.wasm.numThreads = 1;
      engine = engines[data.quality] ? data.quality : "light";
      const adapter = engines[engine].gpu ? await navigator.gpu?.requestAdapter?.().catch(() => null) : null;
      if (engines[engine].gpu && !adapter?.info) throw new Error("WEBGPU_UNAVAILABLE");
      recognizer = await load(pipeline, engine, adapter);
      self.postMessage({ type: "engine", model: engines[engine].model });
      self.postMessage({ type: "warming" });
      await recognizer(new Float32Array(16000), engine === "next" ? { language: "ko", max_new_tokens: 1 } : { language: "ko", task: "transcribe", max_new_tokens: 1 });
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({ type: "error", phase: "load", text: String(error) });
    }
    return;
  }
  if (data.type === "audio") {
    try {
      if (!recognizer) throw new Error("음성 모델이 준비되지 않았습니다.");
      const options = engine === "next"
        ? { language: "ko", max_new_tokens: 512 }
        : { language: "ko", task: "transcribe", do_sample: false, num_beams: 1, max_new_tokens: 512 };
      const result = await recognizer(data.audio, options);
      self.postMessage({ type: "text", text: result.text ?? "", model: engines[engine].model });
    } catch (error) {
      self.postMessage({ type: "error", phase: "audio", text: String(error) });
    }
  }
};
