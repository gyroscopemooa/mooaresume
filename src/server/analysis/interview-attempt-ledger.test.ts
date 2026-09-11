import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { recordInterviewTurnAttempt } from "./interview-attempt-ledger";

type Inserted = Record<string, unknown>;

function fakeClient(options: { insertError?: string } = {}) {
  const inserted: Inserted[] = [];
  const client = {
    from: () => ({
      insert: async (row: Inserted) => {
        inserted.push(row);
        return { error: options.insertError ? { message: options.insertError } : null };
      },
    }),
  };
  return { client: client as never, inserted };
}

beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); });

describe("recordInterviewTurnAttempt", () => {
  it("실패한 턴의 토큰도 원장에 남긴다", async () => {
    const { client, inserted } = fakeClient();
    const outcome = await recordInterviewTurnAttempt({
      sessionId: "session-1",
      ownerUserId: "user-1",
      turnNo: 2,
      outcome: "PROVIDER_FAILED",
      failureCode: "OpenAI Responses API: 500",
      usage: { model: "gpt-x", responseId: "resp-1", inputTokens: 900, outputTokens: 150, totalTokens: 1_050 },
    }, client);

    expect(outcome).toBe("RECORDED");
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      session_id: "session-1",
      turn_no: 2,
      outcome: "PROVIDER_FAILED",
      failure_code: "OpenAI Responses API: 500",
      input_tokens: 900,
      output_tokens: 150,
    });
  });

  it("토큰을 모르면 0이 아니라 null로 적는다", async () => {
    const { client, inserted } = fakeClient();
    await recordInterviewTurnAttempt({
      sessionId: "session-1", ownerUserId: "user-1", turnNo: 1, outcome: "COMPLETED",
    }, client);
    expect(inserted[0].input_tokens).toBeNull();
    expect(inserted[0].output_tokens).toBeNull();
  });

  it("표가 없어도 턴 진행을 막지 않는다", async () => {
    const { client } = fakeClient({ insertError: 'relation "public.interview_turn_attempts" does not exist' });
    await expect(recordInterviewTurnAttempt({
      sessionId: "session-1", ownerUserId: "user-1", turnNo: 1, outcome: "COMPLETED",
    }, client)).resolves.toBe("FAILED");
  });

  it("서비스 키가 없으면 조용히 건너뛴다", async () => {
    await expect(recordInterviewTurnAttempt({
      sessionId: "session-1", ownerUserId: "user-1", turnNo: 1, outcome: "COMPLETED",
    }, null)).resolves.toBe("SKIPPED");
  });
});
