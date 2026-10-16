import "server-only";
import { z } from "zod";
import { INTERVIEW_FEEDBACK_LIMITS, type InterviewTranscriptionResult } from "@/domain/interview-feedback";
import { InterviewApiError } from "./access";

/** Only canonical PCM16 mono 16 kHz WAV is accepted; video containers never leave the device. */
export function inspectInterviewWav(bytes: Uint8Array): { durationSeconds: number } {
  const fail = () => { throw new InterviewApiError(400, "INVALID_AUDIO", "16kHz 모노 PCM WAV 음성만 전사할 수 있습니다. 화면에서 음성을 다시 추출해 주세요."); };
  if (bytes.byteLength < 46 || bytes.byteLength > INTERVIEW_FEEDBACK_LIMITS.maxAudioBytes) return fail();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (ascii(0) !== "RIFF" || ascii(8) !== "WAVE" || view.getUint32(4, true) !== bytes.byteLength - 8) return fail();
  let validFormat = false;
  let dataSize = 0;
  let dataOffset = 0;
  let cursor = 12;
  while (cursor + 8 <= bytes.byteLength) {
    const name = ascii(cursor);
    const size = view.getUint32(cursor + 4, true);
    const end = cursor + 8 + size;
    if (end > bytes.byteLength) return fail();
    if (name === "fmt ") {
      if (validFormat || size !== 16 || view.getUint16(cursor + 8, true) !== 1 || view.getUint16(cursor + 10, true) !== 1 || view.getUint32(cursor + 12, true) !== 16_000 || view.getUint32(cursor + 16, true) !== 32_000 || view.getUint16(cursor + 20, true) !== 2 || view.getUint16(cursor + 22, true) !== 16) return fail();
      validFormat = true;
    } else if (name === "data") {
      if (!validFormat || dataSize || size < 2 || size % 2) return fail();
      dataSize = size; dataOffset = cursor + 8;
    } else {
      // Do not allow hidden metadata or arbitrary extra containers in an upload.
      return fail();
    }
    cursor = end + (size % 2);
  }
  const durationSeconds = dataSize / 32_000;
  if (!validFormat || !dataSize || cursor !== bytes.byteLength || durationSeconds > 180 || durationSeconds <= 0) return fail();
  let peak = 0;
  for (let offset = dataOffset; offset < dataOffset + dataSize; offset += 2) peak = Math.max(peak, Math.abs(view.getInt16(offset, true)));
  if (!peak) throw new InterviewApiError(422, "SILENT_AUDIO", "음성 신호가 없는 파일입니다. 전사 요청을 보내지 않았습니다.");
  return { durationSeconds };
}

const transcriptSchema = z.object({
  text: z.string().trim().min(1).max(12_000),
  segments: z.array(z.object({ start: z.number().finite().nonnegative(), end: z.number().finite().nonnegative(), text: z.string().trim().min(1).max(12_000) })).min(1).max(400),
});

export async function runInterviewTranscription(bytes: Uint8Array<ArrayBuffer>, requestId: string, options: { apiKey: string; model: string; signal?: AbortSignal }, fetcher: typeof fetch = fetch): Promise<InterviewTranscriptionResult> {
  const { durationSeconds } = inspectInterviewWav(bytes);
  if (options.model !== "whisper-1") throw new InterviewApiError(503, "UNSUPPORTED_TRANSCRIPTION_MODEL", "현재 타임스탬프 전사는 whisper-1 설정만 지원합니다.");
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: "audio/wav" }), "interview-audio.wav");
  form.set("model", options.model);
  form.set("language", "ko");
  form.set("response_format", "verbose_json");
  form.set("timestamp_granularities[]", "segment");
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(90_000)]) : AbortSignal.timeout(90_000);
  const response = await fetcher("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${options.apiKey}` }, body: form, signal, redirect: "error" });
  if (!response.ok) throw new InterviewApiError(502, "TRANSCRIPTION_FAILED", "음성 전사 요청이 실패했습니다. 자동 재요청하지 않았습니다.");
  const parsed = transcriptSchema.safeParse(await response.json());
  if (!parsed.success || parsed.data.segments.some((segment, index, segments) => segment.end <= segment.start || segment.end > durationSeconds + 0.5 || (index > 0 && segment.start < segments[index - 1].end - 0.05))) throw new InterviewApiError(502, "INVALID_TRANSCRIPTION", "전사 결과 또는 시간 정보를 확인할 수 없습니다.");
  return {
    text: parsed.data.text,
    segments: parsed.data.segments.map(segment => ({ ...segment, start: Math.min(segment.start, durationSeconds), end: Math.min(segment.end, durationSeconds) })),
    durationSeconds,
    metadata: { model: options.model, provider: "openai", schemaVersion: "interview-transcription-1.0", requestId },
    notice: "자동 전사에는 오류·생략이 있을 수 있습니다. 원본과 비교해 수정·확인한 뒤 답변 분석을 시작해 주세요. 발음 평가 결과가 아닙니다.",
  };
}
