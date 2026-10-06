import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import { advanceQuickBackgroundAnalysis } from "./quick-background-execution";
import type { QuickBackgroundResponse, QuickGatewayResult } from "@/server/ai/quick/openai-responses-gateway";
import type { RepairPlan } from "@/server/ai/quick/revision-repair";

const request: AnalysisRequest = {
  requestId: "case-1",
  product: "PRO",
  writingMode: "POLISH",
  writingStyle: "BALANCED",
  targetLength: 1000,
  documents: [{ kind: "cover_letter", text: "지원서 본문" }],
};

describe("QUICK background execution recovery", () => {
  const candidate: QuickGatewayResult = {
    output: { schemaVersion: "1.0", readiness: { score: 75, label: "검토", summary: "검토", reasons: ["본문 확인"] }, priorities: [], verificationQuestions: [], revision: { originalAnnotations: [], subheading: null, lengthNote: null, revisedAnswer: "지원서 본문", reasons: [], highlightedPhrases: [], verificationNote: null } },
    execution: { responseId: "writer", model: "test", promptVersion: "test", rubricVersion: "test", schemaVersion: "1.0", inputTokens: 10, outputTokens: 10, totalTokens: 20 },
  };
  function harness(cursor = "writer") {
    return {
      analysisRunId: "run-1",
      repository: { getRunningContext: vi.fn().mockResolvedValue({ analysisRunId: "run-1", responseId: cursor, request, attemptCount: 1 }), saveBackgroundResponse: vi.fn(), compareAndSwapResponse: vi.fn().mockResolvedValue(true) },
      gateway: { startBackground: vi.fn(), getBackground: vi.fn().mockResolvedValue({ status: "completed", result: candidate }), startReview: vi.fn().mockResolvedValue("reviewer"), getReview: vi.fn().mockResolvedValue({ status: "pending", responseId: "reviewer" }) },
    };
  }
  it.each(["QUICK", "PRO", "FINAL"])("persists a separate review before completing %s", async product => {
    const input = harness(); input.repository.getRunningContext.mockResolvedValue({ analysisRunId: "run-1", responseId: "writer", request: { ...request, product }, attemptCount: 1 });
    const step = await advanceQuickBackgroundAnalysis(input);
    expect(step.status === "polled" && step.response.status).toBe("pending");
    expect(input.gateway.startReview).toHaveBeenCalledTimes(1);
    expect(input.repository.compareAndSwapResponse).toHaveBeenLastCalledWith("run-1", expect.stringContaining("|starting|"), "quality-v1|writer|reviewer");
  });
  it("does not start a writer or poll a provider during a claimed context lookup", async () => {
    const input = harness();
    input.repository.getRunningContext.mockResolvedValue({ analysisRunId: "run-1", responseId: null, request: { ...request, contextResearch: { version: "context-1", status: "pending", checkedAt: new Date().toISOString(), summary: "", sources: [] } }, attemptCount: 1 });
    expect((await advanceQuickBackgroundAnalysis(input)).status).toBe("started");
    expect(input.gateway.startBackground).not.toHaveBeenCalled();
    expect(input.gateway.getBackground).not.toHaveBeenCalled();
  });
  it("a concurrent losing poll cannot purchase another review", async () => {
    const input = harness(); input.repository.compareAndSwapResponse.mockResolvedValue(false);
    await advanceQuickBackgroundAnalysis(input);
    expect(input.gateway.startReview).not.toHaveBeenCalled();
  });
  it("waits for a live lease and recovers an expired lease", async () => {
    const live = harness(`quality-v1|writer|starting|${Date.now()}`);
    await advanceQuickBackgroundAnalysis(live);
    expect(live.gateway.startReview).not.toHaveBeenCalled();
    const expired = harness(`quality-v1|writer|starting|${Date.now() - 120_000}`);
    await advanceQuickBackgroundAnalysis(expired);
    expect(expired.gateway.startReview).toHaveBeenCalledOnce();
  });
  it("resumes the saved review without another generation", async () => {
    const input = harness("quality-v1|writer|reviewer");
    input.gateway.getReview.mockResolvedValue({ status: "completed", result: candidate });
    const result = await advanceQuickBackgroundAnalysis(input);
    expect(result.status === "polled" && result.response.status).toBe("completed");
    expect(input.gateway.getReview).toHaveBeenCalledWith("reviewer", request, candidate);
    expect(input.gateway.startReview).not.toHaveBeenCalled();
  });
  it("never returns an unreviewed candidate on review failure", async () => {
    const input = harness("quality-v1|writer|reviewer");
    input.gateway.getReview.mockResolvedValue({ status: "failed", responseId: "reviewer", reason: "incomplete" });
    const step = await advanceQuickBackgroundAnalysis(input);
    expect(step.status === "polled" && step.response.status).toBe("failed");
  });
  it("leaves fabricated candidates to the existing validator before buying a review", async () => {
    const input = harness();
    input.gateway.getBackground.mockResolvedValue({ status: "completed", result: { ...candidate, output: { ...candidate.output, revision: { ...candidate.output.revision, revisedAnswer: "99% 개선" } } } });
    await advanceQuickBackgroundAnalysis(input);
    expect(input.gateway.startReview).not.toHaveBeenCalled();
  });
  it("restarts a running analysis whose provider response ID was not saved", async () => {
    const saveBackgroundResponse = vi.fn().mockResolvedValue(undefined);
    const startBackground = vi.fn().mockResolvedValue("resp-recovered");
    const getBackground = vi.fn();

    await expect(
      advanceQuickBackgroundAnalysis({
        analysisRunId: "run-1",
        repository: {
          getRunningContext: vi.fn().mockResolvedValue({
            analysisRunId: "run-1",
            responseId: null,
            request,
            attemptCount: 2,
          }),
          saveBackgroundResponse,
        },
        gateway: { startBackground, getBackground },
      }),
    ).resolves.toEqual({ status: "started", analysisRunId: "run-1" });

    // 몇 번째 시도인지가 함께 넘어가야 재시도의 출력 상한을 올릴 수 있습니다.
    expect(startBackground).toHaveBeenCalledWith(request, 2);
    expect(saveBackgroundResponse).toHaveBeenCalledWith(
      "run-1",
      "resp-recovered",
    );
    expect(getBackground).not.toHaveBeenCalled();
  });

  it("polls the existing provider response instead of starting a duplicate", async () => {
    const startBackground = vi.fn();
    const getBackground = vi.fn().mockResolvedValue({
      status: "pending",
      responseId: "resp-existing",
    });

    const result = await advanceQuickBackgroundAnalysis({
      analysisRunId: "run-1",
      repository: {
        getRunningContext: vi.fn().mockResolvedValue({
          analysisRunId: "run-1",
          responseId: "resp-existing",
          request,
        }),
        saveBackgroundResponse: vi.fn(),
      },
      gateway: { startBackground, getBackground },
    });

    expect(result).toEqual({
      status: "polled",
      analysisRunId: "run-1",
      request,
      response: { status: "pending", responseId: "resp-existing" },
    });
    expect(startBackground).not.toHaveBeenCalled();
    expect(getBackground).toHaveBeenCalledWith("resp-existing");
  });
});

describe("QUICK background execution: rewriting rejected questions", () => {
  const T0 = 1_760_000_000_000;
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(T0); });
  afterEach(() => { vi.useRealTimers(); });

  const plan: RepairPlan = { orders: [1], notes: [{ order: 1, reason: "기관 이름을 지웠습니다.", previousAnswer: "탈락한 수정안" }] };
  const resultOf = (responseId: string, totalTokens: number): QuickGatewayResult => ({
    output: { schemaVersion: "1.0", readiness: { score: 75, label: "검토", summary: "검토", reasons: ["본문 확인"] }, priorities: [], verificationQuestions: [], revision: { originalAnnotations: [], subheading: null, lengthNote: null, revisedAnswer: "지원서 본문", reasons: [], highlightedPhrases: [], verificationNote: null } },
    execution: { responseId, model: "test", promptVersion: "test", rubricVersion: "test", schemaVersion: "1.0", inputTokens: 10, outputTokens: 10, totalTokens },
  });
  const writerResult = resultOf("writer", 20);
  const firstPass = resultOf("first-pass", 50);
  const repairedResult = resultOf("repair-1", 15);
  const finalResult = resultOf("final", 90);

  /** 커서를 실제로 저장하는 가짜 저장소. compareAndSwapResponse는 기대값이 맞을 때만 바꾼다. */
  function build(cursor: string, extra: { startedAt?: string | null; attemptCount?: number; withRepairMethods?: boolean } = {}) {
    const state = { cursor };
    const repository = {
      getRunningContext: vi.fn(async () => ({ analysisRunId: "run-1", responseId: state.cursor, request, attemptCount: extra.attemptCount ?? 1, startedAt: extra.startedAt === undefined ? new Date(T0 - 60_000).toISOString() : extra.startedAt })),
      saveBackgroundResponse: vi.fn(),
      compareAndSwapResponse: vi.fn(async (_id: string, expected: string, next: string) => { if (state.cursor !== expected) return false; state.cursor = next; return true; }),
    };
    const gateway = {
      startBackground: vi.fn(),
      getBackground: vi.fn<(id: string) => Promise<QuickBackgroundResponse>>(async (id) => ({ status: "completed", result: id === "repair-1" ? repairedResult : writerResult })),
      startReview: vi.fn().mockResolvedValue("review-1"),
      getReview: vi.fn<(id: string) => Promise<QuickBackgroundResponse>>(async () => ({ status: "completed", result: firstPass, repair: plan })),
      ...(extra.withRepairMethods === false ? {} : {
        startRepair: vi.fn<(request: AnalysisRequest, plan: RepairPlan) => Promise<string>>(async () => "repair-1"),
        startRepairReview: vi.fn<(...args: unknown[]) => Promise<string>>(async () => "review-2"),
        getRepairReview: vi.fn<(...args: unknown[]) => Promise<QuickBackgroundResponse>>(async () => ({ status: "completed", result: finalResult })),
      }),
    };
    return { state, repository, gateway, run: () => advanceQuickBackgroundAnalysis({ analysisRunId: "run-1", repository, gateway }) };
  }
  type Step = Awaited<ReturnType<typeof advanceQuickBackgroundAnalysis>>;
  const responseOf = (step: Step) => (step.status === "polled" ? step.response : null);
  const expectPending = (step: Step) => expect(responseOf(step)?.status).toBe("pending");
  /** 재작성 없이(또는 접고) 첫 검토 결과로 끝났는지. `repair` 표시가 남아 있으면 안 된다. */
  const expectFirstPass = (step: Step, result: QuickGatewayResult = firstPass) => {
    const response = responseOf(step);
    expect(response?.status).toBe("completed");
    if (response?.status !== "completed") return;
    expect(response.result).toBe(result);
    expect(response.repair).toBeUndefined();
  };
  const OLD = (age: number) => T0 - age;
  const inRewrite = (startedAt = OLD(30_000)) => `quality-v1|writer|review-1|repair|repair-1|${startedAt}`;

  it("starts a rewrite when the first review names rejected questions, and saves where it is", async () => {
    const h = build("quality-v1|writer|review-1");
    expectPending(await h.run());
    expect(h.gateway.startRepair).toHaveBeenCalledWith(request, plan);
    expect(h.repository.compareAndSwapResponse).toHaveBeenNthCalledWith(1, "run-1", "quality-v1|writer|review-1", `quality-v1|writer|review-1|repair|starting|${T0}`);
    expect(h.state.cursor).toBe(`quality-v1|writer|review-1|repair|repair-1|${T0}`);
  });

  it("finishes with the first review when there is nothing to rewrite", async () => {
    const h = build("quality-v1|writer|review-1");
    h.gateway.getReview.mockResolvedValue({ status: "completed", result: firstPass });
    expectFirstPass(await h.run());
    expect(h.gateway.startRepair).not.toHaveBeenCalled();
  });

  it("buys no rewrite while another poll holds the claim", async () => {
    const h = build("quality-v1|writer|review-1");
    h.repository.compareAndSwapResponse.mockResolvedValue(false);
    expectPending(await h.run());
    expect(h.gateway.startRepair).not.toHaveBeenCalled();
  });

  it("finishes with the first review when the rewrite cannot be started, and keeps the claim so it is not retried every poll", async () => {
    const h = build("quality-v1|writer|review-1");
    h.gateway.startRepair?.mockRejectedValue(new Error("boom"));
    expectFirstPass(await h.run());
    expect(h.state.cursor).toBe(`quality-v1|writer|review-1|repair|starting|${T0}`);
  });

  it.each([
    ["the run is already past the start window", { startedAt: new Date(T0 - 6 * 60_000).toISOString() }],
    ["this is a retry attempt", { attemptCount: 2 }],
    ["the gateway has no rewrite support", { withRepairMethods: false }],
  ])("does not rewrite when %s", async (_name, extra) => {
    const h = build("quality-v1|writer|review-1", extra);
    expectFirstPass(await h.run());
    expect(h.state.cursor).toBe("quality-v1|writer|review-1");
  });

  it("still rewrites when the run start time is unknown (older callers)", async () => {
    const h = build("quality-v1|writer|review-1", { startedAt: null });
    expectPending(await h.run());
    expect(h.gateway.startRepair).toHaveBeenCalledTimes(1);
  });

  it("waits while the rewrite is still running, and keeps its place", async () => {
    const h = build(inRewrite());
    h.gateway.getBackground.mockImplementation(async (id) => (id === "repair-1" ? { status: "pending", responseId: id } : { status: "completed", result: writerResult }));
    expectPending(await h.run());
    expect(h.gateway.startRepairReview).not.toHaveBeenCalled();
    expect(h.state.cursor).toBe(inRewrite());
  });

  it("falls back to the first review when the rewrite failed", async () => {
    const h = build(inRewrite());
    h.gateway.getBackground.mockImplementation(async (id) => (id === "repair-1" ? { status: "failed", responseId: id, reason: "incomplete" } : { status: "completed", result: writerResult }));
    expectFirstPass(await h.run());
    expect(h.gateway.getReview).toHaveBeenCalledWith("review-1", request, writerResult);
  });

  it("starts the second review once the rewrite is done", async () => {
    const h = build(inRewrite());
    expectPending(await h.run());
    expect(h.gateway.startRepairReview).toHaveBeenCalledWith(request, writerResult, repairedResult, "review-1");
    expect(h.state.cursor).toBe(`${inRewrite()}|review|review-2`);
  });

  it("buys no second review when another poll got there first", async () => {
    const h = build(inRewrite());
    h.repository.compareAndSwapResponse.mockResolvedValue(false);
    expectPending(await h.run());
    expect(h.gateway.startRepairReview).not.toHaveBeenCalled();
  });

  it("finishes with the first review when the second review cannot be started", async () => {
    const h = build(inRewrite());
    h.gateway.startRepairReview?.mockRejectedValue(new Error("REVISION_REPAIR_MERGE_FAILED"));
    expectFirstPass(await h.run());
  });

  it("returns the combined result once the second review is done", async () => {
    const h = build(`${inRewrite()}|review|review-2`);
    expectFirstPass(await h.run(), finalResult);
    expect(h.gateway.getRepairReview).toHaveBeenCalledWith("review-2", request, writerResult, repairedResult, "review-1");
  });

  it("waits for a pending second review and falls back when it failed", async () => {
    const cursor = `${inRewrite()}|review|review-2`;
    const waiting = build(cursor);
    waiting.gateway.getRepairReview?.mockResolvedValue({ status: "pending", responseId: "review-2" });
    expectPending(await waiting.run());
    expect(waiting.state.cursor).toBe(cursor);
    const failed = build(cursor);
    failed.gateway.getRepairReview?.mockResolvedValue({ status: "failed", responseId: "review-2", reason: "REVISION_REPAIR_INVALID" });
    expectFirstPass(await failed.run());
  });

  it("gives up on the rewrite after four minutes in any rewrite stage and does not even poll it", async () => {
    const old = OLD(5 * 60_000);
    for (const cursor of [
      `quality-v1|writer|review-1|repair|starting|${old}`,
      `quality-v1|writer|review-1|repair|repair-1|${old}`,
      `quality-v1|writer|review-1|repair|repair-1|${old}|review|starting|${OLD(1_000)}`,
      `quality-v1|writer|review-1|repair|repair-1|${old}|review|review-2`,
    ]) {
      const h = build(cursor);
      expectFirstPass(await h.run());
      expect(h.gateway.getBackground).toHaveBeenCalledTimes(1); // 작성 응답만 읽는다
      expect(h.gateway.getRepairReview).not.toHaveBeenCalled();
    }
  });

  it("waits on a live claim and gives up on a dead one", async () => {
    const claimAt = (kind: "rewrite" | "second review", at: number) => (kind === "rewrite"
      ? `quality-v1|writer|review-1|repair|starting|${at}`
      : `quality-v1|writer|review-1|repair|repair-1|${OLD(200_000)}|review|starting|${at}`);
    for (const kind of ["rewrite", "second review"] as const) {
      const live = build(claimAt(kind, OLD(10_000)));
      expectPending(await live.run());
      const dead = build(claimAt(kind, OLD(120_000)));
      expectFirstPass(await dead.run());
    }
  });

  it("never fails the analysis because a rewrite stage threw", async () => {
    const h = build(`${inRewrite()}|review|review-2`);
    h.gateway.getRepairReview?.mockRejectedValue(new Error("network"));
    expectFirstPass(await h.run());
  });

  it("an old-format cursor (no rewrite) behaves exactly as before: a pending first review just waits", async () => {
    const h = build("quality-v1|writer|review-1");
    h.gateway.getReview.mockResolvedValue({ status: "pending", responseId: "review-1" });
    expectPending(await h.run());
    expect(h.repository.compareAndSwapResponse).not.toHaveBeenCalled();
  });
});
