import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as status } from "@/app/api/dev/interview-pro/status/route";
import { POST as feedbackPost } from "@/app/api/dev/interview-pro/feedback/route";
import { POST as transcribePost } from "@/app/api/dev/interview-pro/transcribe/route";
import { interviewFeedbackResultSchema, type InterviewFeedbackOutput } from "@/domain/interview-feedback";
import { inspectInterviewWav } from "./transcription-gateway";
import { payloadDigest, runInterviewRequest } from "./request-limiter";
import { readBoundedBody } from "./access";
import { QUESTION_CRITERIA } from "@/domain/interview-training";

const answer = "현장 인수인계 표를 만들어 확인 항목을 공유했습니다.";
function output(): InterviewFeedbackOutput {
  const absent = { status: "missing" as const, evidence: null, comment: "추가 확인이 필요합니다." };
  return { summary: "직접 행동을 했으나 결과 설명이 필요합니다.", strengths: [{ title: "직접 행동", evidence: "인수인계 표를 만들어", reason: "직접 한 일이 보입니다." }], priorities: [{ title: "결과 확인", evidence: "확인 항목을 공유했습니다.", reason: "실제 성과가 없습니다.", improvedAnswer: "확인 항목을 공유했습니다. [실제 결과 확인 필요]", practice: "결과를 한 문장으로 말해 보세요." }], star: { situation: absent, task: absent, action: { status: "present", evidence: "표를 만들어", comment: "행동을 제시했습니다." }, result: absent }, betterAnswer: answer, verificationQuestions: ["그 후 결과는 무엇인가요?"], likelyFollowups: ["어떤 항목이 있었나요?"], unassessed: [] };
}
function envelope(value = output()) { return { id: "resp_test", model: "gpt-6-astra", status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ ...value, questionType: "experience", criteria: QUESTION_CRITERIA.experience.map(name => ({ name, status: "missing", evidence: null, comment: "확인 필요" })), keywords: [{ text: "인수인계 표", evidence: "인수인계 표를 만들어" }], annotations: [], nextTurn: { action: "follow_up", question: "공유 이후 무엇이 달라졌나요?", evidence: "확인 항목을 공유했습니다.", reason: "결과 확인" } }) }] }], usage: { input_tokens: 120, output_tokens: 230, total_tokens: 350 } }; }
function input() { return { requestId: crypto.randomUUID(), consent: true, transcriptConfirmed: true, question: "직접 개선한 경험은 무엇인가요?", company: "기업", role: "생산", answerText: answer, durationSeconds: 30, transcriptSource: "manual" }; }
function headers() { return { origin: "http://localhost:3000", cookie: "mooa_mail_admin=test-admin", "content-type": "application/json" }; }
function request(body = input(), extra: Record<string, string> = {}) { return new Request("http://localhost:3000/api/dev/interview-pro/feedback", { method: "POST", headers: { ...headers(), ...extra }, body: JSON.stringify(body) }); }
function wav(seconds = 1, silent = false) {
  const bytes = new Uint8Array(44 + seconds * 32_000);
  const view = new DataView(bytes.buffer);
  for (const [offset, text] of [[0, "RIFF"], [8, "WAVE"], [12, "fmt "], [36, "data"]] as const) for (let index = 0; index < text.length; index++) view.setUint8(offset + index, text.charCodeAt(index));
  view.setUint32(4, bytes.length - 8, true); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 16_000, true); view.setUint32(28, 32_000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); view.setUint32(40, seconds * 32_000, true);
  if (!silent) view.setInt16(44, 1000, true);
  return bytes;
}
function transcriptionRequest(audio = wav(), consent = "true") {
  const form = new FormData(); form.set("file", new Blob([audio], { type: "audio/wav" }), "private-name.wav"); form.set("requestId", crypto.randomUUID()); form.set("consent", consent);
  return new Request("http://localhost:3000/api/dev/interview-pro/transcribe", { method: "POST", headers: { origin: "http://localhost:3000", cookie: "mooa_mail_admin=test-admin" }, body: form });
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("MAIL_ADMIN_SECRET", "test-admin"); vi.stubEnv("OPENAI_API_KEY", "test-key-not-real"); vi.stubEnv("INTERVIEW_PRO_AI_ENABLED", "true"); vi.stubEnv("OPENAI_MODEL_INTERVIEW_PRO", "gpt-6-astra"); vi.stubEnv("OPENAI_MODEL_INTERVIEW_TRANSCRIBE", "whisper-1");
  delete (globalThis as typeof globalThis & { __mooaInterviewDevLimiter?: unknown }).__mooaInterviewDevLimiter;
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(envelope())));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("local Interview PRO boundary", () => {
  it("reports status without exposing credentials", async () => {
    const response = await status(new Request("http://localhost:3000/api/dev/interview-pro/status", { headers: headers() }));
    const body = await response.json();
    expect(body).toMatchObject({ authorized: true, configured: true, enabled: true, model: "gpt-6-astra" });
    expect(JSON.stringify(body)).not.toContain("test-key");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not reveal model configuration to unauthorized visitors", async () => {
    const response = await status(new Request("http://localhost:3000/api/dev/interview-pro/status"));
    expect(await response.json()).toMatchObject({ authorized: false, configured: false, model: "" });
  });
  it("404s in production and non-loopback hosts", async () => {
    vi.stubEnv("NODE_ENV", "production"); expect((await feedbackPost(request())).status).toBe(404);
    vi.stubEnv("NODE_ENV", "development"); expect((await status(new Request("https://example.com/api/dev/interview-pro/status"))).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects adminless, foreign-origin and forwarded-host requests", async () => {
    expect((await feedbackPost(request(input(), { cookie: "" }))).status).toBe(401);
    expect((await feedbackPost(request(input(), { origin: "https://evil.example" }))).status).toBe(403);
    expect((await feedbackPost(request(input(), { "x-forwarded-host": "public.example" }))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("accepts Next-normalized loopback URLs while matching Origin to actual Host", async () => {
    const loopback = { host: "127.0.0.1:3000", "x-forwarded-host": "127.0.0.1:3000", origin: "http://127.0.0.1:3000" };
    expect((await feedbackPost(request(input(), loopback))).status).toBe(200);
    expect((await feedbackPost(request(input(), { ...loopback, origin: "http://localhost:3000" }))).status).toBe(403);
    expect((await feedbackPost(request(input(), { ...loopback, host: "evil.example:3000" }))).status).toBe(403);
    expect((await feedbackPost(request(input(), { ...loopback, host: "127.0.0.1:4000", origin: "http://127.0.0.1:4000" }))).status).toBe(403);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("requires opt-in, consent and verified transcript", async () => {
    vi.stubEnv("INTERVIEW_PRO_AI_ENABLED", "false"); expect((await feedbackPost(request())).status).toBe(503);
    vi.stubEnv("INTERVIEW_PRO_AI_ENABLED", "true");
    expect((await feedbackPost(request({ ...input(), consent: false }))).status).toBe(400);
    expect((await feedbackPost(request({ ...input(), transcriptConfirmed: false }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("enforces stream bounds even without Content-Length", async () => {
    await expect(readBoundedBody(new Request("http://localhost", { method: "POST", body: "123456" }), 5)).rejects.toMatchObject({ status: 413 });
    expect((await feedbackPost(request(input(), { "content-length": "900000" }))).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("actual feedback integration with mocked provider", () => {
  it("uses Responses Structured Outputs with explicit model and grounded result", async () => {
    const response = await feedbackPost(request()); const result = await response.json();
    expect(response.status).toBe(200); expect(interviewFeedbackResultSchema.safeParse(result).success).toBe(true);
    expect(result.metadata).toMatchObject({ model: "gpt-6-astra", inputTokens: 120, outputTokens: 230 });
    const [, options] = vi.mocked(fetch).mock.calls[0]; const body = JSON.parse(options?.body as string);
    expect(body).toMatchObject({ model: "gpt-6-astra", store: false, max_output_tokens: 6000, text: { format: { strict: true, type: "json_schema", schema: { additionalProperties: false } } } });
    expect(result.feedback.unassessed.join(" ")).toContain("발음");
  });
  it("rejects invented quotes and facts represented by new numbers", async () => {
    const value = output(); value.strengths[0].evidence = "매출을 높였습니다";
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(envelope(value)));
    expect((await feedbackPost(request())).status).toBe(502);
    const numbered = output(); numbered.betterAnswer = "품질 오류를 70% 줄였습니다.";
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(envelope(numbered)));
    expect((await feedbackPost(request())).status).toBe(502);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("does not display incomplete or refused model outputs", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ...envelope(), status: "incomplete" }));
    expect((await feedbackPost(request())).status).toBe(502);
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ...envelope(), output: [{ type: "message", content: [{ type: "refusal" }] }] }));
    expect((await feedbackPost(request())).status).toBe(422);
  });
  it("deduplicates same request, conflicts different payload, does not leak upstream errors", async () => {
    const body = input(); expect((await feedbackPost(request(body))).status).toBe(200);
    expect((await feedbackPost(request(body))).status).toBe(200);
    expect((await feedbackPost(request({ ...body, answerText: answer + " 별도 경험입니다." }))).status).toBe(409);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.mocked(fetch).mockResolvedValueOnce(new Response("secret-provider-error", { status: 500 }));
    const failedInput = input(); const failed = await feedbackPost(request(failedInput));
    expect(await failed.text()).not.toContain("secret-provider-error");
    expect((await feedbackPost(request(failedInput))).status).toBe(502);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("blocks concurrent work and has a bounded per-process hourly call count", async () => {
    let finish!: (value: string) => void;
    const pending = runInterviewRequest("a", "same", () => new Promise<string>(resolve => { finish = resolve; }));
    await Promise.resolve();
    await expect(runInterviewRequest("b", "other", async () => "b")).rejects.toMatchObject({ status: 429, code: "BUSY" });
    finish("done"); await pending;
    for (let index = 0; index < 11; index++) await runInterviewRequest(`key${index}`, payloadDigest(String(index)), async () => index);
    await expect(runInterviewRequest("over", "over", async () => 0)).rejects.toMatchObject({ code: "CALL_LIMIT" });
  });
  it("actively expires raw results at ten minutes while retaining no-rebill tombstones", async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => ({ privateTranscript: answer }));
    await runInterviewRequest("private", "hash", run);
    await vi.advanceTimersByTimeAsync(600_001);
    await expect(runInterviewRequest("private", "hash", run)).rejects.toMatchObject({ code: "RESULT_EXPIRED" });
    expect(run).toHaveBeenCalledTimes(1);
    const shared = (globalThis as typeof globalThis & { __mooaInterviewDevLimiter?: { entries: Map<string, { promise: unknown }> } }).__mooaInterviewDevLimiter;
    expect(shared?.entries.get("private")?.promise).toBeNull();
    await vi.advanceTimersByTimeAsync(3_000_000);
    expect(shared?.entries.size).toBe(0);
  });
});

describe("audio-only transcription", () => {
  it("sends only validated WAV with generic filename and timestamp format", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ text: answer, segments: [{ start: 0, end: 1, text: answer }] }));
    const result = await transcribePost(transcriptionRequest());
    expect(result.status).toBe(200); expect(await result.json()).toMatchObject({ text: answer, durationSeconds: 1 });
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    const form = options?.body as FormData;
    expect(form.get("model")).toBe("whisper-1"); expect(form.get("response_format")).toBe("verbose_json");
    expect((form.get("file") as File).name).toBe("interview-audio.wav");
  });
  it("rejects disguised video, silence, missing consent and overlong WAV before a call", async () => {
    const disguised = wav(); disguised.set(new TextEncoder().encode("ftyp"), 0);
    expect((await transcribePost(transcriptionRequest(disguised))).status).toBe(400);
    expect((await transcribePost(transcriptionRequest(wav(1, true)))).status).toBe(422);
    expect((await transcribePost(transcriptionRequest(wav(), "false"))).status).toBe(400);
    expect(() => inspectInterviewWav(wav(181))).toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects extra chunks and wrong PCM format", () => {
    const stereo = wav(); new DataView(stereo.buffer).setUint16(22, 2, true); expect(() => inspectInterviewWav(stereo)).toThrow();
    const rate = wav(); new DataView(rate.buffer).setUint32(24, 48_000, true); expect(() => inspectInterviewWav(rate)).toThrow();
    const badSize = wav(); new DataView(badSize.buffer).setUint32(40, 40, true); expect(() => inspectInterviewWav(badSize)).toThrow();
  });
  it("rejects impossible timestamps without presenting false anchors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ text: answer, segments: [{ start: 0, end: 30, text: answer }] }));
    expect((await transcribePost(transcriptionRequest())).status).toBe(502);
  });
  it.each([
    { text: answer, segments: [] },
    { text: answer, segments: [{ start: 0, end: 0, text: answer }] },
    { text: answer, segments: [{ start: 0, end: 0.8, text: answer }, { start: 0.2, end: 1, text: answer }] },
    { text: " ", segments: [{ start: 0, end: 1, text: " " }] },
  ])("rejects malformed STT payload %j", async value => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(value));
    expect((await transcribePost(transcriptionRequest())).status).toBe(502);
  });
});
