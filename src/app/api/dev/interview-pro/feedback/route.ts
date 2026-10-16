import { interviewFeedbackRequestSchema } from "@/domain/interview-feedback";
import { InterviewApiError, interviewErrorResponse, interviewJson, readBoundedBody, requireInterviewAccess } from "@/server/ai/interview-pro/access";
import { runInterviewFeedback } from "@/server/ai/interview-pro/feedback-gateway";
import { payloadDigest, runInterviewRequest } from "@/server/ai/interview-pro/request-limiter";

export async function POST(request: Request) {
  try {
    const config = requireInterviewAccess(request);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new InterviewApiError(415, "JSON_REQUIRED", "JSON 입력이 필요합니다.");
    const bytes = await readBoundedBody(request, 96 * 1024);
    let raw: unknown;
    try { raw = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { throw new InterviewApiError(400, "INVALID_INPUT", "입력 형식을 확인해 주세요."); }
    const parsed = interviewFeedbackRequestSchema.safeParse(raw);
    if (!parsed.success) throw new InterviewApiError(400, "INVALID_INPUT", "질문·답변·전사 확인과 외부 AI 전송 동의를 확인해 주세요.");
    const input = parsed.data;
    const result = await runInterviewRequest(`feedback:${input.requestId}`, payloadDigest(JSON.stringify(input)), () => runInterviewFeedback(input, { apiKey: config.apiKey, model: config.model, signal: request.signal }));
    return interviewJson(result);
  } catch (error) { return interviewErrorResponse(error); }
}
