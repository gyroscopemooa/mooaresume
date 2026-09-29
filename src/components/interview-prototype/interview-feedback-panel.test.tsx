// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InterviewFeedbackResult, InterviewFeedbackStatus, InterviewTranscriptionResult } from "@/domain/interview-feedback";
import { InterviewFeedbackPanel, type InterviewFeedbackPanelProps } from "./interview-feedback-panel";

const mocks = vi.hoisted(() => ({ exportAudio: vi.fn() }));
vi.mock("@/lib/interview-media/audio-client", () => ({ exportAudioForTranscription: mocks.exportAudio }));

const uuid = "fe336bba-c17a-4c52-afd2-0909b2e5a333";
const answer = "팀 프로젝트에서 요구사항을 정리하고 역할을 나눠 문제를 해결했습니다.";
const status: InterviewFeedbackStatus = {
  configured: true, authorized: true, enabled: true, model: "test-model", transcriptionModel: "test-transcription",
  limits: { maxAudioBytes: 12 * 1024 * 1024, maxDurationSeconds: 180, maxAnswerCharacters: 12_000, maxOutputTokens: 6_000, callsPerHour: 12 }, reason: null,
};
const result: InterviewFeedbackResult = {
  feedback: {
    summary: "역할 분담은 보이지만 결과를 더 구체화하면 좋겠습니다.",
    strengths: [{ title: "주도적인 행동", evidence: "요구사항을 정리하고", reason: "본인이 수행한 행동이 드러납니다." }],
    priorities: [{ title: "결과를 구체적으로 설명하세요", evidence: "문제를 해결했습니다.", reason: "어떻게 달라졌는지 확인하기 어렵습니다.", improvedAnswer: "요구사항을 정리하고 역할을 나눴습니다. [실제로 확인한 변화를 덧붙이세요.]", practice: "결과를 한 문장으로 정리해 말해 보세요." }],
    star: {
      situation: { status: "partial", evidence: "팀 프로젝트에서", comment: "어떤 프로젝트인지 설명해 주세요." },
      task: { status: "missing", evidence: null, comment: "해결해야 했던 과제가 빠졌습니다." },
      action: { status: "present", evidence: "요구사항을 정리하고", comment: "본인 행동이 드러납니다." },
      result: { status: "partial", evidence: "문제를 해결했습니다.", comment: "변화를 구체화해 주세요." },
    },
    betterAnswer: "팀 프로젝트에서 요구사항을 정리하고 역할을 나눴습니다. [확인한 결과를 보완하세요.]",
    verificationQuestions: ["문제 해결 뒤 어떤 변화가 있었나요?"], likelyFollowups: ["역할은 어떤 기준으로 나눴나요?"], unassessed: ["발음과 표정은 평가하지 않았습니다."],
  },
  metadata: { model: "test-model", promptVersion: "test-prompt", rubricVersion: "test-rubric", schemaVersion: "test-schema", inputTokens: 123, outputTokens: 456, totalTokens: 579, responseId: "test-response", requestId: uuid },
};
const transcription: InterviewTranscriptionResult = {
  text: answer, segments: [{ start: 2, end: 6, text: answer }], durationSeconds: 10,
  metadata: { model: "test-transcription", provider: "openai", schemaVersion: "test-schema", requestId: uuid }, notice: "테스트 응답",
};
const defaults: InterviewFeedbackPanelProps = { sourceBlob: null, sourceKey: null, durationSeconds: 0, initialQuestion: "문제를 해결한 경험을 설명해 주세요.", initialCompany: "테스트 기업", initialRole: "개발" };
const consentLabel = /선택한 음성\(받아쓰기 시\) 또는 질문·답변 텍스트를 OpenAI에 전송/;
const confirmedLabel = /질문과 답변 내용을 확인했어요/;

function json(value: unknown, ok = true) { return { ok, json: async () => value } as Response; }
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.exportAudio.mockResolvedValue(new Blob(["audio-only-wav"], { type: "audio/wav" }));
  fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith("/status")) return json(status);
    if (url.endsWith("/transcribe")) return json(transcription);
    if (url.endsWith("/feedback")) return json(result);
    throw new Error("Unexpected URL");
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function mount(props: Partial<InterviewFeedbackPanelProps> = {}) {
  const view = render(<InterviewFeedbackPanel {...defaults} {...props} />);
  await waitFor(() => expect(screen.queryByText("AI 연결 상태를 확인하고 있어요…")).toBeNull());
  return view;
}
function prepareAnswer() {
  fireEvent.change(screen.getByLabelText("내 답변"), { target: { value: answer } });
  fireEvent.click(screen.getByLabelText(consentLabel));
  fireEvent.click(screen.getByLabelText(confirmedLabel));
}
function analyzeButton() { return screen.getByRole("button", { name: "AI 답변 분석" }) as HTMLButtonElement; }

async function transcribeThenAnalyze(props: Partial<InterviewFeedbackPanelProps> = {}) {
  const view = await mount({ sourceBlob: new Blob(["video"], { type: "video/webm" }), sourceKey: "recording", durationSeconds: 10, ...props });
  fireEvent.click(screen.getByLabelText(consentLabel));
  fireEvent.click(screen.getByRole("button", { name: "답변 받아쓰기" }));
  await waitFor(() => expect((screen.getByLabelText("내 답변") as HTMLTextAreaElement).value).toBe(answer));
  fireEvent.click(screen.getByLabelText(confirmedLabel)); fireEvent.click(analyzeButton());
  await screen.findByText(result.feedback.summary);
  return view;
}

describe("InterviewFeedbackPanel — mocked API lifecycle, never live provider calls", () => {
  it("does not auto-submit audio or text, and requires consent plus answer verification", async () => {
    await mount();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(analyzeButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("내 답변"), { target: { value: answer } });
    fireEvent.click(screen.getByLabelText(consentLabel));
    expect(analyzeButton().disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(confirmedLabel));
    expect(analyzeButton().disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(result.feedback.summary)).toBeNull();
  });

  it("analyzes a manually typed answer without a microphone or source and displays actionable feedback first", async () => {
    await mount(); prepareAnswer(); fireEvent.click(analyzeButton());
    await screen.findByText(result.feedback.summary);
    const request = fetchMock.mock.calls.find(([url]) => url.endsWith("/feedback"));
    expect(request).toBeTruthy();
    expect(JSON.parse(request![1].body)).toEqual(expect.objectContaining({ answerText: answer, transcriptSource: "manual", consent: true, transcriptConfirmed: true, durationSeconds: null, question: defaults.initialQuestion, company: defaults.initialCompany, role: defaults.initialRole }));
    expect(screen.getByText("다음 답변에서 바꿀 점")).toBeTruthy();
    expect(screen.getByText(result.feedback.priorities[0].reason)).toBeTruthy();
    expect(screen.getByText(result.feedback.priorities[0].improvedAnswer)).toBeTruthy();
    expect(screen.getByText(result.feedback.priorities[0].practice)).toBeTruthy();
    expect(mocks.exportAudio).not.toHaveBeenCalled();
  });

  it("disables provider calls when unauthorized and exposes connection recovery without fabricated results", async () => {
    fetchMock.mockResolvedValue(json({ ...status, authorized: false, reason: "관리자 계정으로 로그인해 주세요." }));
    await mount(); prepareAnswer();
    expect(screen.getByText("관리자 계정으로 로그인해 주세요.")).toBeTruthy();
    expect(analyzeButton().disabled).toBe(true);
    fireEvent.click(analyzeButton());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "연결 다시 확인" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("keeps diagnostic signals out of paid analysis even if the model is configured", async () => {
    const reason = "측정 검증 신호는 실제 면접 답변이 아닙니다.";
    await mount({ sourceBlob: new Blob(["test"]), sourceKey: "diagnostic", disabledReason: reason }); prepareAnswer();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(analyzeButton().disabled).toBe(true);
    expect((screen.getByRole("button", { name: "답변 받아쓰기" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("exports and sends audio-only WAV, then requires verification before feedback", async () => {
    const blob = new Blob(["private-video-container"], { type: "video/webm" }); const onSeek = vi.fn();
    await mount({ sourceBlob: blob, sourceKey: "recording-1", durationSeconds: 10, onSeek });
    fireEvent.click(screen.getByLabelText(consentLabel)); fireEvent.click(screen.getByRole("button", { name: "답변 받아쓰기" }));
    await waitFor(() => expect((screen.getByLabelText("내 답변") as HTMLTextAreaElement).value).toBe(answer));
    expect(mocks.exportAudio).toHaveBeenCalledWith(blob, expect.any(AbortSignal), 10);
    const request = fetchMock.mock.calls.find(([url]) => url.endsWith("/transcribe"));
    const form = request![1].body as FormData;
    expect((form.get("file") as File).type).toBe("audio/wav");
    expect((form.get("file") as File).name).toBe("interview-answer.wav");
    expect(form.get("consent")).toBe("true");
    expect(analyzeButton().disabled).toBe(true);
    fireEvent.click(screen.getByText(/받아쓰기 구간 확인/));
    fireEvent.click(screen.getByRole("button", { name: "0:02" })); expect(onSeek).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByLabelText(confirmedLabel)); fireEvent.click(analyzeButton());
    await screen.findByText(result.feedback.summary);
    expect(JSON.parse(fetchMock.mock.calls.find(([url]) => url.endsWith("/feedback"))![1].body).transcriptSource).toBe("transcription");
  });

  it("invalidates existing feedback when answer or question is edited", async () => {
    await mount(); prepareAnswer(); fireEvent.click(analyzeButton()); await screen.findByText(result.feedback.summary);
    fireEvent.change(screen.getByLabelText("면접 질문"), { target: { value: "다른 질문입니다." } });
    expect(screen.queryByText(result.feedback.summary)).toBeNull();
    expect((screen.getByLabelText(confirmedLabel) as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByLabelText(confirmedLabel)); fireEvent.click(analyzeButton()); await screen.findByText(result.feedback.summary);
    fireEvent.change(screen.getByLabelText("내 답변"), { target: { value: `${answer} 추가 설명입니다.` } });
    expect(screen.queryByText(result.feedback.summary)).toBeNull();
  });

  it("aborts stale requests and resets consent and transcript on source changes", async () => {
    let finish: ((value: Response) => void) | undefined;
    fetchMock.mockImplementation(async (url: string) => url.endsWith("/status") ? json(status) : new Promise<Response>((resolve) => { finish = resolve; }));
    const view = await mount({ sourceKey: "old" }); prepareAnswer(); fireEvent.click(analyzeButton());
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/feedback"))).toBe(true));
    const signal = fetchMock.mock.calls.find(([url]) => url.endsWith("/feedback"))![1].signal as AbortSignal;
    view.rerender(<InterviewFeedbackPanel {...defaults} sourceKey="new" />);
    expect(signal.aborted).toBe(true);
    await act(async () => { finish?.(json(result)); });
    expect(screen.queryByText(result.feedback.summary)).toBeNull();
    expect((screen.getByLabelText("내 답변") as HTMLTextAreaElement).value).toBe("");
    expect((screen.getByLabelText(consentLabel) as HTMLInputElement).checked).toBe(false);
  });

  it("aborts an in-flight request on edits and ignores late results", async () => {
    let finish: ((value: Response) => void) | undefined;
    fetchMock.mockImplementation(async (url: string) => url.endsWith("/status") ? json(status) : new Promise<Response>((resolve) => { finish = resolve; }));
    await mount(); prepareAnswer(); fireEvent.click(analyzeButton());
    await waitFor(() => expect(fetchMock.mock.calls.length).toBe(2));
    const signal = fetchMock.mock.calls[1][1].signal as AbortSignal;
    fireEvent.change(screen.getByLabelText("내 답변"), { target: { value: `${answer} 새 답변.` } });
    expect(signal.aborted).toBe(true);
    await act(async () => { finish?.(json(result)); });
    expect(screen.queryByText(result.feedback.summary)).toBeNull();
  });

  it("shows provider failures without substitute feedback or implicit retries", async () => {
    fetchMock.mockImplementation(async (url: string) => url.endsWith("/status") ? json(status) : json({ error: "현재 모델을 사용할 수 없습니다.", code: "provider_error" }, false));
    await mount(); prepareAnswer(); fireEvent.click(analyzeButton());
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "현재 모델을 사용할 수 없습니다.");
    expect(screen.queryByText("이번 답변의 핵심")).toBeNull(); expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(analyzeButton().disabled).toBe(false);
  });

  it("rejects malformed provider responses instead of showing incomplete results", async () => {
    fetchMock.mockImplementation(async (url: string) => url.endsWith("/status") ? json(status) : json({ feedback: { summary: "검증되지 않은 답변" } }));
    await mount(); prepareAnswer(); fireEvent.click(analyzeButton());
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "AI 결과 형식을 확인하지 못했습니다. 확인되지 않은 점수나 예시 결과는 표시하지 않습니다.");
    expect(screen.queryByText("검증되지 않은 답변")).toBeNull();
  });

  it("lets users cancel and discloses that already dispatched requests can still incur cost", async () => {
    fetchMock.mockImplementation(async (url: string) => url.endsWith("/status") ? json(status) : new Promise<Response>(() => {}));
    await mount(); prepareAnswer(); fireEvent.click(analyzeButton());
    fireEvent.click(screen.getByRole("button", { name: "요청 중단" }));
    expect((fetchMock.mock.calls[1][1].signal as AbortSignal).aborted).toBe(true);
    expect(screen.getByText(/이미 서버에 전달된 AI 요청은 처리·과금될 수 있습니다/)).toBeTruthy();
  });

  it("links priority and strength quotes only to unique exact transcript segments and removes links after manual edits", async () => {
    const onSeek = vi.fn();
    await transcribeThenAnalyze({ onSeek });
    const links = screen.getAllByRole("button", { name: "원음에서 확인 0:02" });
    expect(links).toHaveLength(2);
    fireEvent.click(links[0]); expect(onSeek).toHaveBeenCalledWith(2);
    fireEvent.change(screen.getByLabelText("내 답변"), { target: { value: `${answer} 수동으로 수정했습니다.` } });
    fireEvent.click(screen.getByLabelText(confirmedLabel)); fireEvent.click(analyzeButton());
    await screen.findByText(result.feedback.summary);
    expect(screen.queryByRole("button", { name: /원음에서 확인/ })).toBeNull();
  });

  it.each([
    { label: "similar but nonidentical wording", segments: [{ start: 2, end: 6, text: "요구 사항을 정리하고 문제를 해결했어요." }] },
    { label: "duplicate exact quotes", segments: [{ start: 2, end: 4, text: answer }, { start: 5, end: 8, text: answer }] },
  ])("does not guess an evidence timestamp for $label", async ({ segments }) => {
    fetchMock.mockImplementation(async (url: string) => url.endsWith("/status") ? json(status) : url.endsWith("/transcribe") ? json({ ...transcription, segments }) : json(result));
    await transcribeThenAnalyze({ onSeek: vi.fn() });
    expect(screen.queryByRole("button", { name: /원음에서 확인/ })).toBeNull();
  });

  it("shows an honest empty priorities state instead of inventing an improvement", async () => {
    fetchMock.mockImplementation(async (url: string) => url.endsWith("/status") ? json(status) : json({ ...result, feedback: { ...result.feedback, priorities: [] } }));
    await mount(); prepareAnswer(); fireEvent.click(analyzeButton());
    await screen.findByText("현재 답변에서 근거를 갖춰 지적할 개선점은 찾지 못했습니다.");
    expect(screen.queryByText("이렇게 다듬어 보세요")).toBeNull();
  });

  it.each([false, true])("focuses the returned result and respects reduced motion (%s)", async (reducedMotion) => {
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, writable: true, value: scroll });
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reducedMotion })));
    try {
      await mount(); prepareAnswer(); fireEvent.click(analyzeButton());
      await screen.findByText(result.feedback.summary);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "이번 답변의 핵심" }));
      expect(scroll).toHaveBeenCalledWith({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    } finally {
      delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
    }
  });
});
