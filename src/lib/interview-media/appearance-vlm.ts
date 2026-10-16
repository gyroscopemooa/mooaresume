export type AppearanceObservation = {
  hairEyes: "yes" | "no" | "uncertain";
  collar: "orderly" | "disordered" | "uncertain";
  faceOcclusion: "yes" | "no" | "uncertain";
  imageQuality: "usable" | "poor" | "uncertain";
  evidence: string;
};

export type AppearanceFrameResult = AppearanceObservation & {
  timeSeconds: number;
  imageDataUrl: string;
  rawOutput: string;
};

export type AppearanceVlmResult = {
  model: "HuggingFaceTB/SmolVLM-256M-Instruct";
  runtime: "Transformers.js 4.3.1 / WebGPU";
  frames: AppearanceFrameResult[];
  status: "quality_validation";
};

const value = (raw: string, key: string) => raw.match(new RegExp(`${key}\\s*=\\s*([a-z]+)`, "i"))?.[1]?.toLowerCase();
const enumValue = <T extends string>(raw: string, key: string, allowed: readonly T[], fallback: T): T => {
  const found = value(raw, key);
  return allowed.includes(found as T) ? found as T : fallback;
};

export function parseAppearanceVlmOutput(raw: string): AppearanceObservation {
  const assistantOutput = raw.includes("Assistant:") ? raw.slice(raw.lastIndexOf("Assistant:") + "Assistant:".length).trim() : raw.trim();
  const hasStructuredAnswer = /HAIR_EYES\s*=\s*(?:yes|no|uncertain)/i.test(assistantOutput)
    && /COLLAR\s*=\s*(?:orderly|disordered|uncertain)/i.test(assistantOutput)
    && /FACE_OCCLUSION\s*=\s*(?:yes|no|uncertain)/i.test(assistantOutput)
    && /IMAGE_QUALITY\s*=\s*(?:usable|poor|uncertain)/i.test(assistantOutput);
  if (!hasStructuredAnswer) return { hairEyes: "uncertain", collar: "uncertain", faceOcclusion: "uncertain", imageQuality: "uncertain", evidence: assistantOutput.slice(0, 240) || "모델이 시각 관찰 문장을 반환하지 않았습니다." };
  return {
    hairEyes: enumValue(assistantOutput, "HAIR_EYES", ["yes", "no", "uncertain"] as const, "uncertain"),
    collar: enumValue(assistantOutput, "COLLAR", ["orderly", "disordered", "uncertain"] as const, "uncertain"),
    faceOcclusion: enumValue(assistantOutput, "FACE_OCCLUSION", ["yes", "no", "uncertain"] as const, "uncertain"),
    imageQuality: enumValue(assistantOutput, "IMAGE_QUALITY", ["usable", "poor", "uncertain"] as const, "uncertain"),
    evidence: assistantOutput.match(/EVIDENCE\s*=\s*([^\r\n]+)/i)?.[1]?.trim().slice(0, 240) || "모델이 형식에 맞는 시각 근거를 반환하지 않았습니다.",
  };
}

function waitFor(video: HTMLVideoElement, event: "loadeddata" | "seeked", action: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error("VLM용 영상 프레임을 불러오지 못했습니다.")); }, 15_000);
    const cleanup = () => { clearTimeout(timer); video.removeEventListener(event, done); video.removeEventListener("error", failed); };
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("VLM용 영상 프레임을 읽지 못했습니다.")); };
    video.addEventListener(event, done, { once: true });
    video.addEventListener("error", failed, { once: true });
    action();
  });
}

async function extractFrames(blob: Blob, durationHint: number): Promise<{ timeSeconds: number; imageDataUrl: string }[]> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  const url = URL.createObjectURL(blob);
  try {
    await waitFor(video, "loadeddata", () => { video.src = url; video.load(); });
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : durationHint;
    if (!duration || !video.videoWidth || !video.videoHeight) throw new Error("VLM에 사용할 영상 길이 또는 프레임을 확인하지 못했습니다.");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 768 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("브라우저가 VLM용 프레임 생성을 지원하지 않습니다.");
    const frames: { timeSeconds: number; imageDataUrl: string }[] = [];
    for (const timeSeconds of [duration * .2, duration * .5, duration * .8]) {
      await waitFor(video, "seeked", () => { video.currentTime = Math.min(timeSeconds, Math.max(0, duration - .05)); });
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({ timeSeconds, imageDataUrl: canvas.toDataURL("image/jpeg", .82) });
    }
    return frames;
  } finally {
    video.pause(); video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url);
  }
}

function infer(worker: Worker, image: string, onProgress?: (message: string) => void): Promise<string> {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const listener = (event: MessageEvent<{ id: string; type: string; output?: string; error?: string; value?: { status?: string; file?: string; progress?: number } }>) => {
      if (event.data.id !== id) return;
      if (event.data.type === "progress") {
        const progress = event.data.value;
        onProgress?.(typeof progress?.progress === "number" ? `분석 준비 ${Math.round(progress.progress)}%` : "분석 모델 준비 중");
      } else {
        worker.removeEventListener("message", listener);
        if (event.data.type === "complete") resolve(event.data.output ?? "");
        else reject(new Error(event.data.error || "로컬 VLM 추론에 실패했습니다."));
      }
    };
    worker.addEventListener("message", listener);
    worker.postMessage({ id, image });
  });
}

export async function analyzeAppearanceWithLocalVlm(blob: Blob, durationHint: number, onProgress?: (message: string) => void): Promise<AppearanceVlmResult> {
  if (!("gpu" in navigator)) throw new Error("이 브라우저에서 WebGPU를 사용할 수 없어 로컬 VLM을 실행하지 못했습니다.");
  const frames = await extractFrames(blob, durationHint);
  const worker = new Worker(new URL("./local-appearance-vlm.worker.ts", import.meta.url), { type: "module" });
  try {
    const results: AppearanceFrameResult[] = [];
    for (let index = 0; index < frames.length; index++) {
      onProgress?.(`대표 프레임 ${index + 1}/${frames.length} 분석 중`);
      const rawOutput = await infer(worker, frames[index].imageDataUrl, onProgress);
      results.push({ ...frames[index], ...parseAppearanceVlmOutput(rawOutput), rawOutput });
    }
    return { model: "HuggingFaceTB/SmolVLM-256M-Instruct", runtime: "Transformers.js 4.3.1 / WebGPU", frames: results, status: "quality_validation" };
  } finally {
    worker.terminate();
  }
}
