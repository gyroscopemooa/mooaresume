import { z } from "zod";
import { INTERVIEW_FEEDBACK_LIMITS } from "@/domain/interview-feedback";
import { InterviewApiError, interviewErrorResponse, interviewJson, readBoundedBody, requireInterviewAccess } from "@/server/ai/interview-pro/access";
import { payloadDigest, runInterviewRequest } from "@/server/ai/interview-pro/request-limiter";
import { inspectInterviewWav, runInterviewTranscription } from "@/server/ai/interview-pro/transcription-gateway";

export async function POST(request: Request) {
  try {
    const config = requireInterviewAccess(request);
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data;")) throw new InterviewApiError(415, "AUDIO_REQUIRED", "음성 파일이 필요합니다.");
    const bytes = await readBoundedBody(request, INTERVIEW_FEEDBACK_LIMITS.maxAudioBytes + 64 * 1024);
    let form: FormData;
    try { form = await new Response(bytes, { headers: { "Content-Type": contentType } }).formData(); }
    catch { throw new InterviewApiError(400, "INVALID_INPUT", "음성 전송 형식을 확인해 주세요."); }
    if (form.get("consent") !== "true") throw new InterviewApiError(400, "CONSENT_REQUIRED", "음성을 외부 AI에 전송하는 데 동의해 주세요.");
    const requestId = z.uuid().safeParse(form.get("requestId"));
    if (!requestId.success) throw new InterviewApiError(400, "INVALID_REQUEST_ID", "요청 번호가 올바르지 않습니다.");
    const file = form.get("file");
    if (!file || typeof file === "string" || file.type !== "audio/wav" || file.size > INTERVIEW_FEEDBACK_LIMITS.maxAudioBytes) throw new InterviewApiError(400, "INVALID_AUDIO", "WAV 음성 파일만 전송할 수 있습니다.");
    const audio = new Uint8Array(await file.arrayBuffer());
    inspectInterviewWav(audio);
    const result = await runInterviewRequest(`transcribe:${requestId.data}`, payloadDigest(audio), () => runInterviewTranscription(audio, requestId.data, { apiKey: config.apiKey, model: config.transcriptionModel, signal: request.signal }));
    return interviewJson(result);
  } catch (error) { return interviewErrorResponse(error); }
}
