import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import { advanceQuickBackgroundAnalysis } from "@/server/analysis/quick-background-execution";
import { OpenAIResponsesGateway } from "./openai-responses-gateway";
import type { RevisionReview } from "./revision-quality";
import { REPAIR_ENV } from "./revision-repair";

/**
 * 탈락한 문항을 검토 의견과 함께 다시 쓰는 흐름 전체를, 진짜 게이트웨이와 진짜 진행 코드로 돌린다.
 * 가짜는 OpenAI 응답(fetch)과 DB 커서 저장소뿐이다. 진행 코드는 게이트웨이를 클래스 인스턴스로 받으므로,
 * 가짜 객체만으로는 잡히지 않는 연결 실수(메서드를 꺼내 쓰다 `this`를 잃는 것 등)도 여기서 걸린다.
 */

const ORIGINAL = [
  "저는 한빛지역개발공사 인턴으로 민원 접수 양식을 새로 만들었습니다. 접수 누락을 줄이려고 직접 현장을 다녔습니다.",
  "동아리 회장으로 신입 부원을 맞았습니다. 부원들의 이야기를 먼저 들었습니다.",
];
/** 작성 AI의 첫 수정안: 1번은 기관 이름을 지웠고, 2번은 괜찮다. */
const FIRST_TRY = [
  "저는 인턴으로 민원 양식을 새로 만들었습니다. 누락을 줄이려고 현장을 다녔습니다.",
  "동아리 회장으로서 신입 부원을 맞이할 때 부원들의 이야기를 먼저 들었습니다.",
];
/** 검토 의견("기관 이름을 지웠습니다")을 받고 다시 쓴 1번. */
const REWRITTEN = "저는 한빛지역개발공사 인턴으로 민원 접수 양식을 새로 만들었습니다. 누락을 줄이려고 직접 현장을 다녔습니다.";

const request: AnalysisRequest = {
  requestId: "repair-flow", product: "QUICK", writingMode: "POLISH", writingStyle: "BALANCED", targetLength: 500,
  documents: [{ kind: "cover_letter", text: ORIGINAL.join("\n\n") }],
  questions: ORIGINAL.map((answer, index) => ({ id: String(index + 1), title: `문항 ${index + 1}`, prompt: "", targetLength: 500, answer })),
};

const analysisOutput = (revised: string[]) => ({
  schemaVersion: "1.0" as const,
  readiness: { score: 50, label: "보완 필요", summary: "원문을 다듬었습니다.", reasons: ["구체적 경험이 있습니다."] },
  priorities: [], verificationQuestions: [],
  revision: { originalAnnotations: [], subheading: null, lengthNote: null, revisedAnswer: revised[0], highlightedPhrases: [], reasons: [], verificationNote: null },
  revisions: revised.map((revisedAnswer, index) => ({ questionOrder: index + 1, originalAnnotations: [], subheading: null, lengthNote: null, revisedAnswer, highlightedPhrases: [], reasons: [], verificationNote: null })),
});

const scores = (value: number) => ({ questionFit: value, evidence: value, logic: value, readability: value, specificity: value });
type Verdict = RevisionReview["questions"][number];
const verdict = (order: number, patch: Partial<Verdict>): Verdict => ({
  order, before: scores(2), after: scores(3), meaningfulImprovement: true, newError: false, lostFactOrVoice: false, reintroducedIssue: false, preferenceOnly: false,
  reason: "이유", sourceQuote: "", candidateQuote: "", previousErrorQuote: null, validAnnotationIndexes: [], validLengthNote: false, ...patch,
});
const reviewOf = (questions: Verdict[], label = "보완 필요"): RevisionReview => ({
  diagnosis: { readiness: { score: 50, label, summary: "원문을 다듬었습니다.", reasons: ["구체적 경험이 있습니다."] }, priorities: [], verificationQuestions: [] },
  questions, crossQuestionRegression: false, crossQuestionOrders: [], validAdviceIndexes: [], adviceCorrections: [],
});

const FIRST_REVIEW = reviewOf([
  verdict(1, { after: scores(2), meaningfulImprovement: false, lostFactOrVoice: true, reason: "기관 이름 한빛지역개발공사를 지웠습니다.", sourceQuote: "한빛지역개발공사 인턴으로", candidateQuote: "인턴으로 민원 양식을" }),
  verdict(2, { reason: "신입 부원을 맞는 장면이 더 분명해졌습니다.", sourceQuote: "신입 부원을 맞았습니다", candidateQuote: "신입 부원을 맞이할 때" }),
]);
const rewrittenVerdict = (patch: Partial<Verdict> = {}) => verdict(1, { reason: "기관 이름과 직접 현장을 다닌 사실이 남았고 문장이 간결해졌습니다.", sourceQuote: "접수 누락을 줄이려고 직접 현장을 다녔습니다", candidateQuote: "누락을 줄이려고 직접 현장을 다녔습니다", ...patch });
// 두 번째 검토는 다시 쓰지 않은 2번을 "새 오류"라고 판정하지만, 그 판정은 쓰이면 안 된다(첫 검토의 통과 판정이 남아야 한다).
const untouchedVerdict = verdict(2, { newError: true, reason: "다시 쓰지 않은 문항의 판정", sourceQuote: "신입 부원을 맞았습니다", candidateQuote: "신입 부원을 맞이할 때" });
const SECOND_REVIEW = reviewOf([rewrittenVerdict(), untouchedVerdict], "두 번째 검토의 진단");

const completed = (id: string, body: unknown, usage: [number, number, number]) => ({
  id, model: "test", status: "completed", output_text: JSON.stringify(body), usage: { input_tokens: usage[0], output_tokens: usage[1], total_tokens: usage[2] },
});

type Post = { name: string; body: { input: string; instructions: string; background?: boolean } };
function fakeOpenAI(overrides: Record<string, unknown> = {}) {
  const stored: Record<string, unknown> = {
    "writer-1": completed("writer-1", analysisOutput(FIRST_TRY), [10, 20, 30]),
    "review-1": completed("review-1", FIRST_REVIEW, [3, 4, 7]),
    "repair-1": completed("repair-1", analysisOutput([REWRITTEN, ORIGINAL[1]]), [100, 50, 150]),
    "review-2": completed("review-2", SECOND_REVIEW, [5, 6, 11]),
    ...overrides,
  };
  const posts: Post[] = [];
  const gets: string[] = [];
  let reviews = 0;
  const json = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
  const fetchImplementation = vi.fn(async (url: unknown, init?: { method?: string; body?: unknown }) => {
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      const name = body.text.format.name as string;
      posts.push({ name, body });
      const id = name === "revision_quality_review" ? `review-${++reviews}` : String(body.input).includes("[검토 의견에 따른 재작성") ? "repair-1" : "writer-1";
      return json(body.background ? { id, model: "test", status: "queued" } : stored[id]);
    }
    const id = decodeURIComponent(String(url).split("/").pop() ?? "");
    gets.push(id);
    return stored[id] ? json(stored[id]) : new Response("not found", { status: 404 });
  });
  const gateway = new OpenAIResponsesGateway({ apiKey: "test", model: "test", fetchImplementation });
  return { gateway, posts, gets, fetchImplementation };
}

/** 커서를 실제로 저장하는 가짜 저장소 위에서, 끝날 때까지 한 번씩 확인한다(실제로는 브라우저와 크론이 번갈아 한다). */
function runner(gateway: OpenAIResponsesGateway, options: { cursor?: string; startedAt?: string } = {}) {
  const state = { cursor: options.cursor ?? "writer-1" };
  const repository = {
    getRunningContext: vi.fn(async () => ({ analysisRunId: "run-1", responseId: state.cursor, request, attemptCount: 1, startedAt: options.startedAt ?? new Date().toISOString() })),
    saveBackgroundResponse: vi.fn(),
    compareAndSwapResponse: vi.fn(async (_id: string, expected: string, next: string) => {
      if (state.cursor !== expected) return false;
      state.cursor = next;
      return true;
    }),
  };
  const finish = async () => {
    const cursors: string[] = [];
    for (let poll = 0; poll < 12; poll += 1) {
      const step = await advanceQuickBackgroundAnalysis({ analysisRunId: "run-1", repository, gateway });
      cursors.push(state.cursor);
      if (step.status === "polled" && step.response.status !== "pending") return { response: step.response, cursors };
    }
    throw new Error(`분석이 끝나지 않았습니다: ${cursors.join(" -> ")}`);
  };
  return { state, finish };
}

const completedOf = (response: Awaited<ReturnType<ReturnType<typeof runner>["finish"]>>["response"]) => {
  if (response.status !== "completed") throw new Error(`완료가 아닙니다: ${response.status}`);
  return response;
};

afterEach(() => { vi.unstubAllEnvs(); });

describe("rewriting rejected questions: the whole flow with the real gateway", () => {
  it("rewrites the rejected question with the reviewer's reason, has the rewrite reviewed again, and adopts it", async () => {
    vi.stubEnv(REPAIR_ENV, "on");
    const { gateway, posts } = fakeOpenAI();
    const { finish } = runner(gateway);
    const { response, cursors } = await finish();
    const { result } = completedOf(response);

    // 1번은 다시 쓴 글, 2번은 처음 수정안 그대로.
    expect(result.output.revisions?.map((revision) => revision.revisedAnswer)).toEqual([REWRITTEN, FIRST_TRY[1]]);
    expect(result.output.revision.revisedAnswer).toBe(REWRITTEN);
    // 진단은 첫 검토의 것, 다시 쓴 문항의 판정만 두 번째 검토의 것(다시 쓰지 않은 2번은 두 번째가 "새 오류"라 해도 첫 판정 유지).
    expect(result.output.readiness.label).toBe("보완 필요");
    expect(result.revisionQuality).toMatchObject({ decision: "adopt", repairedOrders: [1], reviewerResponseId: "review-2" });
    expect(result.output.revisions?.[0].reasons[0]?.reason).toBe("기관 이름과 직접 현장을 다닌 사실이 남았고 문장이 간결해졌습니다.");
    // 작성 + 첫 검토 + 재작성 + 두 번째 검토의 사용량이 모두 더해진다.
    expect(result.execution).toMatchObject({ responseId: "writer-1", inputTokens: 10 + 3 + 100 + 5, outputTokens: 20 + 4 + 50 + 6, totalTokens: 30 + 7 + 150 + 11 });

    // 호출은 첫 검토 → 재작성 → 두 번째 검토 순서이고, 재작성 요청에는 탈락 이유와 지난 수정안이 들어간다.
    expect(posts.map((post) => post.name)).toEqual(["revision_quality_review", "quick_resume_analysis", "revision_quality_review"]);
    expect(posts[1].body.instructions).toContain("이번 호출은 재작성입니다.");
    expect(posts[1].body.input).toContain("[문항 1 재작성]");
    expect(posts[1].body.input).toContain("기관 이름 한빛지역개발공사를 지웠습니다.");
    expect(posts[1].body.input).toContain(FIRST_TRY[0]);
    expect(posts[1].body.input).not.toContain("[문항 2 재작성]");
    // 두 번째 검토는 다시 쓴 글이 합쳐진 후보를 본다.
    expect(posts[2].body.input).toContain(REWRITTEN);
    expect(posts[2].body.input).toContain(FIRST_TRY[1]);

    // 저장된 자리: 첫 검토 → 재작성 중 → 두 번째 검토 중, 그리고 네 번째 확인에서 끝난다.
    expect(cursors).toHaveLength(4);
    expect(cursors[0]).toBe("quality-v1|writer-1|review-1");
    expect(cursors[1]).toMatch(/^quality-v1\|writer-1\|review-1\|repair\|repair-1\|\d+$/);
    expect(cursors[2]).toMatch(/^quality-v1\|writer-1\|review-1\|repair\|repair-1\|\d+\|review\|review-2$/);
  });

  it("does nothing extra while the switch is off: the first review's result is final", async () => {
    const { gateway, posts } = fakeOpenAI();
    const { finish, state } = runner(gateway);
    const { response, cursors } = await finish();
    const { result } = completedOf(response);
    expect(response).not.toHaveProperty("repair");
    expect(result.output.revisions?.map((revision) => revision.revisedAnswer)).toEqual([ORIGINAL[0], FIRST_TRY[1]]);
    expect(result.revisionQuality).not.toHaveProperty("repairedOrders");
    expect(posts.map((post) => post.name)).toEqual(["revision_quality_review"]);
    expect(cursors).toEqual(["quality-v1|writer-1|review-1", "quality-v1|writer-1|review-1"]);
    expect(state.cursor).toBe("quality-v1|writer-1|review-1");
  });

  it("falls back to the first review's result when the rewrite fails, without buying a second review", async () => {
    vi.stubEnv(REPAIR_ENV, "on");
    const { gateway, posts } = fakeOpenAI({ "repair-1": { id: "repair-1", model: "test", status: "failed" } });
    const { response } = await runner(gateway).finish();
    const { result } = completedOf(response);
    expect(result.output.revisions?.map((revision) => revision.revisedAnswer)).toEqual([ORIGINAL[0], FIRST_TRY[1]]);
    expect(result.revisionQuality).toMatchObject({ decision: "adopt", reviewerResponseId: "review-1" });
    expect(result.revisionQuality).not.toHaveProperty("repairedOrders");
    expect(posts.map((post) => post.name)).toEqual(["revision_quality_review", "quick_resume_analysis"]);
  });

  it("does not review a rewrite that just repeats the rejected text", async () => {
    vi.stubEnv(REPAIR_ENV, "on");
    const { gateway, posts } = fakeOpenAI({ "repair-1": completed("repair-1", analysisOutput([FIRST_TRY[0], ORIGINAL[1]]), [100, 50, 150]) });
    const { response } = await runner(gateway).finish();
    const { result } = completedOf(response);
    expect(result.output.revisions?.map((revision) => revision.revisedAnswer)).toEqual([ORIGINAL[0], FIRST_TRY[1]]);
    expect(posts.map((post) => post.name)).toEqual(["revision_quality_review", "quick_resume_analysis"]);
  });

  it("keeps the original when the second review rejects the rewrite too (one round only)", async () => {
    vi.stubEnv(REPAIR_ENV, "on");
    const rejectedAgain = reviewOf([rewrittenVerdict({ meaningfulImprovement: false, lostFactOrVoice: true, reason: "여전히 사실이 빠졌습니다." }), untouchedVerdict]);
    const { gateway, posts } = fakeOpenAI({ "review-2": completed("review-2", rejectedAgain, [5, 6, 11]) });
    const { response } = await runner(gateway).finish();
    const { result } = completedOf(response);
    expect(result.output.revisions?.map((revision) => revision.revisedAnswer)).toEqual([ORIGINAL[0], FIRST_TRY[1]]);
    expect(result.revisionQuality).toMatchObject({ decision: "adopt", repairedOrders: [1] });
    expect(posts).toHaveLength(3); // 세 번째 검토나 두 번째 재작성은 없다
  });

  it("falls back to the first review's result when the second review leaves the rewritten question unjudged", async () => {
    vi.stubEnv(REPAIR_ENV, "on");
    const { gateway } = fakeOpenAI({ "review-2": completed("review-2", reviewOf([untouchedVerdict]), [5, 6, 11]) });
    const { response } = await runner(gateway).finish();
    const { result } = completedOf(response);
    expect(result.output.revisions?.map((revision) => revision.revisedAnswer)).toEqual([ORIGINAL[0], FIRST_TRY[1]]);
    expect(result.revisionQuality).toMatchObject({ reviewerResponseId: "review-1" });
  });

  it("gives up on the rewrite for a run that is already old", async () => {
    vi.stubEnv(REPAIR_ENV, "on");
    const { gateway, posts } = fakeOpenAI();
    const { response } = await runner(gateway, { startedAt: new Date(Date.now() - 6 * 60_000).toISOString() }).finish();
    const { result } = completedOf(response);
    expect(result.output.revisions?.map((revision) => revision.revisedAnswer)).toEqual([ORIGINAL[0], FIRST_TRY[1]]);
    expect(posts.map((post) => post.name)).toEqual(["revision_quality_review"]);
  });
});

describe("rewriting rejected questions: gateway pieces", () => {
  it("tells the caller which questions can be rewritten only when the switch is on", async () => {
    const { gateway } = fakeOpenAI();
    const writer = (await gateway.getBackground("writer-1"));
    if (writer.status !== "completed") throw new Error("writer");

    const off = await gateway.getReview("review-1", request, writer.result);
    expect(off.status).toBe("completed");
    expect(off).not.toHaveProperty("repair");

    vi.stubEnv(REPAIR_ENV, "on");
    const on = await gateway.getReview("review-1", request, writer.result);
    expect(on).toMatchObject({ status: "completed", repair: { orders: [1], notes: [{ order: 1, reason: "기관 이름 한빛지역개발공사를 지웠습니다.", previousAnswer: FIRST_TRY[0] }] } });
    // 알려 주는 것과 별개로, 이 결과 자체가 다시 쓰지 않았을 때의 최종 결과다.
    if (on.status === "completed") expect(on.result.output.revisions?.[0].revisedAnswer).toBe(ORIGINAL[0]);
  });

  it("waits for a running second review and reports a failed one", async () => {
    vi.stubEnv(REPAIR_ENV, "on");
    const open = fakeOpenAI({ "review-2": { id: "review-2", model: "test", status: "in_progress" } });
    const writer = await open.gateway.getBackground("writer-1");
    const repaired = await open.gateway.getBackground("repair-1");
    if (writer.status !== "completed" || repaired.status !== "completed") throw new Error("setup");
    expect(await open.gateway.getRepairReview("review-2", request, writer.result, repaired.result, "review-1")).toEqual({ status: "pending", responseId: "review-2" });

    const broken = fakeOpenAI({ "review-2": { id: "review-2", model: "test", status: "failed" } });
    expect(await broken.gateway.getRepairReview("review-2", request, writer.result, repaired.result, "review-1")).toMatchObject({ status: "failed", reason: "REVISION_REPAIR_REVIEW_FAILED" });
  });

  it("asks the second reviewer the same questions in the same way (same instructions and strict schema)", async () => {
    vi.stubEnv(REPAIR_ENV, "on");
    const { gateway, posts } = fakeOpenAI();
    await runner(gateway).finish();
    expect(posts[2].body.instructions).toBe(posts[0].body.instructions);
    const firstFormat = (posts[0].body as unknown as { text: { format: { strict: boolean; name: string } } }).text.format;
    const secondFormat = (posts[2].body as unknown as { text: { format: { strict: boolean; name: string } } }).text.format;
    expect(secondFormat).toMatchObject({ strict: firstFormat.strict, name: firstFormat.name });
  });
});

describe("rewriting rejected questions: synchronous analysis (evaluation tools)", () => {
  it("runs the same rewrite and second review when the switch is on", async () => {
    vi.stubEnv(REPAIR_ENV, "on");
    const { gateway, posts } = fakeOpenAI();
    const result = await gateway.analyze(request);
    expect(result.output.revisions?.map((revision) => revision.revisedAnswer)).toEqual([REWRITTEN, FIRST_TRY[1]]);
    expect(result.revisionQuality).toMatchObject({ decision: "adopt", repairedOrders: [1], reviewerResponseId: "review-2" });
    expect(result.execution).toMatchObject({ totalTokens: 30 + 7 + 150 + 11 });
    expect(posts.map((post) => post.name)).toEqual(["quick_resume_analysis", "revision_quality_review", "quick_resume_analysis", "revision_quality_review"]);
  });

  it("stays a single write and a single review when the switch is off", async () => {
    const { gateway, posts } = fakeOpenAI();
    const result = await gateway.analyze(request);
    expect(result.output.revisions?.map((revision) => revision.revisedAnswer)).toEqual([ORIGINAL[0], FIRST_TRY[1]]);
    expect(posts.map((post) => post.name)).toEqual(["quick_resume_analysis", "revision_quality_review"]);
  });

  it("returns the first review's result when the rewrite fails", async () => {
    vi.stubEnv(REPAIR_ENV, "on");
    const { gateway } = fakeOpenAI({ "repair-1": { id: "repair-1", model: "test", status: "failed" } });
    const result = await gateway.analyze(request);
    expect(result.output.revisions?.map((revision) => revision.revisedAnswer)).toEqual([ORIGINAL[0], FIRST_TRY[1]]);
    expect(result.revisionQuality).not.toHaveProperty("repairedOrders");
  });
});
