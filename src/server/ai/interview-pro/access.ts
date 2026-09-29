import "server-only";

import { isAdminRequest } from "@/server/admin/admin-session";
import { INTERVIEW_FEEDBACK_LIMITS, type InterviewFeedbackStatus } from "@/domain/interview-feedback";

export class InterviewApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}

export function interviewConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY?.trim() ?? "",
    model: process.env.OPENAI_MODEL_INTERVIEW_PRO?.trim() || "gpt-6-astra",
    transcriptionModel: process.env.OPENAI_MODEL_INTERVIEW_TRANSCRIBE?.trim() || "whisper-1",
    enabled: process.env.INTERVIEW_PRO_AI_ENABLED === "true",
  };
}

export function assertLocalInterviewRequest(request: Request, post = false) {
  const url = new URL(request.url);
  if (process.env.NODE_ENV !== "development" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new InterviewApiError(404, "NOT_FOUND", "페이지를 찾을 수 없습니다.");
  }
  // Next dev may normalize request.url to localhost while the browser uses 127.0.0.1.
  // Check every host independently against the loopback allowlist, but compare POST
  // Origin to the actual Host header, never a caller-supplied forwarded value.
  const actualHost = request.headers.get("host")?.toLowerCase() ?? url.host;
  const forwardedHost = request.headers.get("x-forwarded-host")?.toLowerCase();
  const localHost = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/u;
  const validHost = (host: string) => {
    if (!localHost.test(host)) return false;
    try {
      const parsed = new URL(`${url.protocol}//${host}`);
      return parsed.port === url.port;
    } catch { return false; }
  };
  if (!validHost(actualHost) || (forwardedHost && !validHost(forwardedHost))) throw new InterviewApiError(403, "HOST_MISMATCH", "로컬 주소로 접속해 주세요.");
  const actualOrigin = new URL(`${url.protocol}//${actualHost}`).origin;
  if (post && request.headers.get("origin") !== actualOrigin) throw new InterviewApiError(403, "ORIGIN_MISMATCH", "같은 로컬 화면에서 요청해 주세요.");
}

export function getInterviewStatus(request: Request): InterviewFeedbackStatus {
  assertLocalInterviewRequest(request);
  const authorized = isAdminRequest(request);
  const config = interviewConfig();
  if (!authorized) return { authorized: false, configured: false, enabled: false, model: "", transcriptionModel: "", limits: INTERVIEW_FEEDBACK_LIMITS, reason: "관리자 로그인 후 사용할 수 있습니다. 같은 로컬 주소의 /MAIL에서 로그인해 주세요." };
  const supportedTranscription = config.transcriptionModel === "whisper-1";
  return {
    authorized: true, configured: Boolean(config.apiKey) && supportedTranscription,
    enabled: config.enabled, model: config.model, transcriptionModel: config.transcriptionModel,
    limits: INTERVIEW_FEEDBACK_LIMITS,
    reason: !config.apiKey ? "서버의 OpenAI API 키 설정이 필요합니다." : !supportedTranscription ? "현재 타임스탬프 전사는 whisper-1 설정만 지원합니다." : !config.enabled ? "로컬 AI 호출이 꺼져 있습니다. INTERVIEW_PRO_AI_ENABLED를 확인해 주세요." : null,
  };
}

export function requireInterviewAccess(request: Request) {
  assertLocalInterviewRequest(request, true);
  if (!isAdminRequest(request)) throw new InterviewApiError(401, "ADMIN_REQUIRED", "관리자 로그인 후 사용할 수 있습니다.");
  const status = getInterviewStatus(request);
  if (!status.configured || !status.enabled) throw new InterviewApiError(503, "AI_NOT_CONFIGURED", status.reason ?? "AI 설정을 확인해 주세요.");
  return interviewConfig();
}

export function interviewJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
}

export function interviewErrorResponse(error: unknown) {
  if (error instanceof InterviewApiError) return interviewJson({ error: error.message, code: error.code }, error.status);
  // Do not return upstream payloads, prompts, documents, filenames, or credentials.
  return interviewJson({ error: "요청을 처리하지 못했습니다. 설정과 입력을 확인한 뒤 다시 시도해 주세요.", code: "REQUEST_FAILED" }, 500);
}

export async function readBoundedBody(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/u.test(declared) || Number(declared) > limit)) throw new InterviewApiError(413, "BODY_TOO_LARGE", "요청 크기 제한을 초과했습니다.");
  if (!request.body) throw new InterviewApiError(400, "BODY_REQUIRED", "입력 내용이 필요합니다.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel(); throw new InterviewApiError(413, "BODY_TOO_LARGE", "요청 크기 제한을 초과했습니다."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}
