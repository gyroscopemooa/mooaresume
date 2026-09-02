import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { recordAnalysisAttempt } from "./attempt-ledger";

type Inserted = Record<string, unknown>;

function fakeClient(options: { attemptCount?: number | null; insertError?: string } = {}) {
  const inserted: Inserted[] = [];
  const client = {
    from(table: string) {
      if (table === "analysis_runs") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: options.attemptCount === undefined ? { attempt_count: 1 } : { attempt_count: options.attemptCount },
              }),
            }),
          }),
        };
      }
      return {
        insert: async (row: Inserted) => {
          inserted.push(row);
          return { error: options.insertError ? { message: options.insertError } : null };
        },
      };
    },
  };
  return { client: client as never, inserted };
}

beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); });

describe("recordAnalysisAttempt", () => {
  it("검증에서 걸린 시도의 토큰을 남긴다 — 지금까지 사라지던 비용", async () => {
    const { client, inserted } = fakeClient();
    const outcome = await recordAnalysisAttempt({
      analysisRunId: "run-1",
      ownerUserId: "user-1",
      outcome: "VALIDATION_FAILED",
      failureCode: "AI_OUTPUT_VALIDATION_FAILED",
      source: "BROWSER",
      usage: { model: "gpt-x", responseId: "resp-1", inputTokens: 4_000, outputTokens: 9_000, totalTokens: 13_000 },
    }, client);

    expect(outcome).toBe("RECORDED");
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      analysis_run_id: "run-1",
      outcome: "VALIDATION_FAILED",
      failure_code: "AI_OUTPUT_VALIDATION_FAILED",
      source: "BROWSER",
      input_tokens: 4_000,
      output_tokens: 9_000,
    });
  });

  it("몇 번째 시도였는지는 세지 않고 DB에 물어본다", async () => {
    const { client, inserted } = fakeClient({ attemptCount: 2 });
    await recordAnalysisAttempt({ analysisRunId: "run-1", ownerUserId: "user-1", outcome: "COMPLETED", source: "CRON" }, client);
    expect(inserted[0].attempt_no).toBe(2);
  });

  it("시도 횟수를 못 읽어도 기록은 남긴다", async () => {
    const { client, inserted } = fakeClient({ attemptCount: null });
    await recordAnalysisAttempt({ analysisRunId: "run-1", ownerUserId: "user-1", outcome: "COMPLETED", source: "CRON" }, client);
    expect(inserted[0].attempt_no).toBe(0);
  });

  it("토큰을 모르면 0이 아니라 null로 적는다", async () => {
    // 0으로 적으면 "공짜 시도"가 되어 원가 합계가 조용히 낮아집니다.
    const { client, inserted } = fakeClient();
    await recordAnalysisAttempt({
      analysisRunId: "run-1", ownerUserId: "user-1",
      outcome: "PROVIDER_FAILED", source: "CRON", usage: { responseId: "resp-9" },
    }, client);
    expect(inserted[0].input_tokens).toBeNull();
    expect(inserted[0].output_tokens).toBeNull();
  });

  it("표가 없어도 분석을 막지 않는다", async () => {
    // 마이그레이션 전에는 insert가 실패합니다. 그때 예외를 던지면 결과가 있는
    // 분석이 기록 때문에 실패로 끝납니다.
    const { client } = fakeClient({ insertError: 'relation "public.analysis_run_attempts" does not exist' });
    await expect(recordAnalysisAttempt({
      analysisRunId: "run-1", ownerUserId: "user-1", outcome: "COMPLETED", source: "BROWSER",
    }, client)).resolves.toBe("FAILED");
  });

  it("서비스 키가 없으면 조용히 건너뛴다", async () => {
    await expect(recordAnalysisAttempt({
      analysisRunId: "run-1", ownerUserId: "user-1", outcome: "COMPLETED", source: "BROWSER",
    }, null)).resolves.toBe("SKIPPED");
  });
});
