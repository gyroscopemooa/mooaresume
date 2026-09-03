import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 손님에게 환불을 알리는 메일.
 *
 * 잘못 보내면 안 보내느니만 못합니다: 돌아오지 않은 돈을 돌아왔다고 말하거나,
 * 카드 내역과 다른 숫자를 적거나, 같은 메일을 여러 번 보내는 것.
 */

const getUserById = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { admin: { getUserById } } }),
}));

const { notifyRefundedApplicant } = await import("./refund-notice-email");

const REFUNDED = { disposition: "REFUNDED", amount: 8_800, currency: "KRW", entitlementsRevoked: 1 } as const;

function okFetch() {
  return vi.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch;
}

function bodyOf(sent: ReturnType<typeof okFetch>) {
  const call = (sent as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls[0];
  return JSON.parse(call[1].body) as { to: string[]; subject: string; text: string; html: string };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "secret";
  process.env.RESEND_API_KEY = "key";
  process.env.ANALYSIS_EMAIL_FROM = "noreply@mooaresume.com";
  process.env.ANALYSIS_EMAIL_REPLY_TO = "help@mooaresume.com";
  getUserById.mockReset().mockResolvedValue({ data: { user: { email: "applicant@example.com" } } });
});

afterEach(() => { vi.clearAllMocks(); });

describe("환불 안내 메일", () => {
  it("손님이 실제로 낸 금액을 적는다", async () => {
    // 폴라에 보낸 숫자는 세전 8,000입니다. 그걸 적으면 카드 내역과 어긋나
    // "800원이 덜 왔다"로 읽힙니다.
    const sent = okFetch();

    expect(await notifyRefundedApplicant({ ownerUserId: "user-1", refund: REFUNDED }, sent))
      .toEqual({ disposition: "SENT" });

    const body = bodyOf(sent);
    expect(body.to).toEqual(["applicant@example.com"]);
    expect(body.subject).toContain("8,800원");
    expect(body.text).toContain("전액 환불");
    expect(body.text).not.toContain("8,000");
  });

  it("환불되지 않은 건에는 아무 말도 하지 않는다", async () => {
    // "환불했습니다"는 돈이 실제로 나갔을 때만 참입니다. UNCERTAIN은 접수
    // 여부조차 모르는 상태입니다.
    const sent = okFetch();

    expect(await notifyRefundedApplicant(
      { ownerUserId: "user-1", refund: { disposition: "NOT_REFUNDED", reason: "REFUND_ERROR" } },
      sent,
    )).toEqual({ disposition: "SKIPPED_NOT_REFUNDED" });
    expect(sent).not.toHaveBeenCalled();
  });

  it("주소를 못 찾으면 보내지 않는다", async () => {
    getUserById.mockResolvedValue({ data: { user: null } });
    const sent = okFetch();

    expect(await notifyRefundedApplicant({ ownerUserId: "user-1", refund: REFUNDED }, sent))
      .toEqual({ disposition: "SKIPPED_NO_ADDRESS" });
    expect(sent).not.toHaveBeenCalled();
  });

  it("메일 설정이 없으면 조용히 넘어간다", async () => {
    // 던지면 실패 기록 자체가 어긋납니다. 메일은 그것보다 덜 중요합니다.
    delete process.env.RESEND_API_KEY;
    const sent = okFetch();

    expect(await notifyRefundedApplicant({ ownerUserId: "user-1", refund: REFUNDED }, sent))
      .toEqual({ disposition: "SKIPPED_NOT_CONFIGURED" });
    expect(sent).not.toHaveBeenCalled();
  });

  it("전송이 거절당해도 던지지 않는다", async () => {
    const sent = vi.fn().mockResolvedValue({ ok: false, status: 429 }) as unknown as typeof fetch;

    expect(await notifyRefundedApplicant({ ownerUserId: "user-1", refund: REFUNDED }, sent))
      .toEqual({ disposition: "FAILED", detail: "RESEND_429" });
  });
});
