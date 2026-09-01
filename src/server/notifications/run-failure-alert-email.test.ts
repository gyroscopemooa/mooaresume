import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 손님이 더 할 수 있는 일이 없는 실패만 알립니다.
 *
 * 재시도가 남은 실패까지 알리면 메일이 매번 오고, 매번 오는 알림은 곧 읽지
 * 않게 됩니다. 그러면 정작 끝난 건도 못 봅니다.
 */

const maybeSingle = vi.fn();
const getUserById = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
    auth: { admin: { getUserById } },
  }),
}));

const { alertExhaustedRun } = await import("./run-failure-alert-email");

const send = vi.fn();

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "secret";
  process.env.RESEND_API_KEY = "key";
  process.env.ANALYSIS_EMAIL_FROM = "noreply@mooaresume.com";
  process.env.ANALYSIS_EMAIL_REPLY_TO = "owner@mooaresume.com";
  maybeSingle.mockReset();
  getUserById.mockReset().mockResolvedValue({ data: { user: { email: "buyer@example.com" } } });
  send.mockReset().mockResolvedValue({ ok: true });
});

afterEach(() => { delete process.env.RESEND_API_KEY; });

const run = (input: { analysisRunId?: string } = {}) =>
  alertExhaustedRun(
    { analysisRunId: input.analysisRunId ?? "run-1", ownerUserId: "user-1", failureCode: "ANALYSIS_FAILED" },
    send as unknown as typeof fetch,
  );

describe("더 시도할 것이 없는 실패", () => {
  it("알린다", async () => {
    maybeSingle.mockResolvedValue({ data: { status: "FAILED", attempt_count: 3, product: "QUICK" } });

    expect(await run()).toBe("SENT");
    expect(send).toHaveBeenCalledOnce();
  });

  it("누가 신청한 건인지 함께 적는다", async () => {
    maybeSingle.mockResolvedValue({ data: { status: "FAILED", attempt_count: 3, product: "QUICK" } });

    await run();

    const body = JSON.parse((send.mock.calls[0][1] as { body: string }).body) as { text: string };
    // 연락할 곳이 없으면 알림을 받아도 할 수 있는 일이 없습니다.
    expect(body.text).toContain("buyer@example.com");
    expect(body.text).toContain("run-1");
  });
});

describe("아직 재시도가 남은 실패", () => {
  it("알리지 않는다", async () => {
    // 재시도가 남으면 fail_quick_analysis가 상태를 PENDING으로 되돌립니다.
    maybeSingle.mockResolvedValue({ data: { status: "PENDING", attempt_count: 1, product: "QUICK" } });

    expect(await run()).toBe("SKIPPED_RETRYABLE");
    expect(send).not.toHaveBeenCalled();
  });
});

describe("메일 설정이 없으면", () => {
  it("조용히 넘어간다", async () => {
    maybeSingle.mockResolvedValue({ data: { status: "FAILED", attempt_count: 3, product: "QUICK" } });
    delete process.env.RESEND_API_KEY;

    expect(await run()).toBe("SKIPPED_NOT_CONFIGURED");
    expect(send).not.toHaveBeenCalled();
  });
});
