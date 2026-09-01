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

type Refund = Parameters<typeof alertExhaustedRun>[0]["refund"];

const run = (input: { analysisRunId?: string; refund?: Refund } = {}) =>
  alertExhaustedRun(
    { analysisRunId: input.analysisRunId ?? "run-1", ownerUserId: "user-1", failureCode: "ANALYSIS_FAILED", refund: input.refund },
    send as unknown as typeof fetch,
  );

const sentText = () => (JSON.parse((send.mock.calls[0][1] as { body: string }).body) as { text: string }).text;

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

describe("환불 결과", () => {
  beforeEach(() => {
    maybeSingle.mockResolvedValue({ data: { status: "FAILED", attempt_count: 3, product: "FINAL" } });
  });

  it("환불했으면 금액과 회수한 이용권을 적는다", async () => {
    await run({ refund: { disposition: "REFUNDED", amount: 19_900, currency: "KRW", entitlementsRevoked: 1 } });

    expect(sentText()).toContain("19,900원을 자동 환불했습니다");
    expect(sentText()).toContain("이용권 1건도 회수했습니다");
  });

  it("환불하지 않았으면 왜인지 적는다", async () => {
    // 예전에는 어느 경우든 "결제·이용권은 되돌려져 있어"라고 단정했습니다.
    // 읽는 사람이 환불이 끝난 줄 알고 넘어가면, 손님은 돈만 내고 아무것도
    // 못 받은 상태로 남습니다.
    await run({ refund: { disposition: "NOT_REFUNDED", reason: "FAILED_WITHOUT_ORDER" } });

    expect(sentText()).toContain("무료 이용권");
    expect(sentText()).not.toContain("자동 환불했습니다");
  });

  it("환불 시도가 오류로 끝났으면 사람을 부른다", async () => {
    await run({ refund: { disposition: "NOT_REFUNDED", reason: "REFUND_ERROR" } });

    expect(sentText()).toContain("폴라에서 직접 확인해 주세요");
  });

  it("환불 정보 없이 불려도 단정하지 않는다", async () => {
    await run();

    expect(sentText()).toContain("환불 여부를 확인하지 못했습니다");
    expect(sentText()).not.toContain("되돌려져 있어");
  });
});
