import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 최종 실패 자동 환불.
 *
 * 돈과 이용권이 함께 걸려 있어서, 순서가 어긋나면 손님이 빈손이 되거나 반대로
 * 돈과 공짜 한 판을 함께 갖게 됩니다. 그 두 가지를 여기서 잠급니다.
 */

const migration = readFileSync(
  "supabase/migrations/20260902010000_quick_failure_auto_refund.sql",
  "utf8",
);

describe("최종 실패 환불 마이그레이션", () => {
  it("결과가 있거나 재시도가 남으면 환불하지 않는다", () => {
    expect(migration).toContain("'disposition', 'COMPLETED'");
    expect(migration).toContain("'disposition', 'RETRYABLE'");
    expect(migration).toContain("target_run.status <> 'FAILED'");
  });

  it("타임아웃 경로와 같은 표시를 보고 두 번 환불하지 않는다", () => {
    expect(migration).toContain("auto_refund_state = 'SUBMITTED'");
    expect(migration).toContain("auto_refund_state in ('SUBMITTING', 'UNCERTAIN')");
    expect(migration).toContain("update public.billing_orders set auto_refund_state = 'SUBMITTING'");
  });

  it("검증된 타임아웃 함수는 건드리지 않는다", () => {
    // 그쪽은 이미 돌고 있는 환불 경로입니다. 여기서 다시 정의하면 두 경로가
    // 서로의 동작을 조용히 바꾸게 됩니다.
    expect(migration).not.toContain("claim_quick_analysis_timeout_refund");
    expect(migration).not.toContain("function public.mark_quick_auto_refund_submitted");
  });

  it("이미 쓴 이용권은 회수하지 않는다", () => {
    // CONSUMED는 결과를 받은 다른 분석의 것입니다.
    expect(migration).toContain("and status = 'ACTIVE'");
    expect(migration).toContain("set status = 'REVOKED'");
  });

  it("두 함수 모두 service_role에만 연다", () => {
    expect(migration).toContain("revoke all on function public.claim_quick_analysis_failure_refund(uuid, uuid) from public");
    expect(migration).toContain("revoke all on function public.revoke_refunded_analysis_entitlement(uuid, uuid) from public");
    expect(migration).toContain("grant execute on function public.claim_quick_analysis_failure_refund(uuid, uuid) to service_role");
    expect(migration).toContain("grant execute on function public.revoke_refunded_analysis_entitlement(uuid, uuid) to service_role");
  });
});

const rpc = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc }) }));

const refundsCreate = vi.fn();
const ordersGet = vi.fn();
vi.mock("@polar-sh/sdk", () => ({ Polar: class { refunds = { create: refundsCreate }; orders = { get: ordersGet }; } }));

vi.mock("./polar-checkout", () => ({
  getPolarCheckoutConfiguration: () => ({ accessToken: "token", server: "sandbox" }),
}));

const { refundExhaustedRun } = await import("./quick-failure-refund");

const CLAIM = {
  disposition: "REFUND_REQUIRED",
  billingOrderId: "11111111-1111-4111-8111-111111111111",
  providerOrderId: "polar-order-1",
  amount: 19_900,
  currency: "KRW",
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "secret";
  rpc.mockReset();
  refundsCreate.mockReset().mockResolvedValue({ id: "refund-1" });
  ordersGet.mockReset().mockResolvedValue({ refundableAmount: 19_900 });
});

afterEach(() => { vi.clearAllMocks(); });

const call = () => refundExhaustedRun({ analysisRunId: "run-1", ownerUserId: "user-1" });

describe("refundExhaustedRun", () => {
  it("환불하고 나서 이용권을 회수한다", async () => {
    rpc.mockImplementation((name: string) => {
      if (name === "claim_quick_analysis_failure_refund") return Promise.resolve({ data: CLAIM, error: null });
      if (name === "revoke_refunded_analysis_entitlement") return Promise.resolve({ data: 1, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    expect(await call()).toEqual({
      disposition: "REFUNDED", amount: 19_900, currency: "KRW", entitlementsRevoked: 1,
    });

    // 순서가 핵심입니다. 먼저 거두고 환불에 실패하면 손님에게 돈도 이용권도
    // 남지 않습니다.
    const order = rpc.mock.calls.map(([name]) => name as string);
    expect(order.indexOf("mark_quick_auto_refund_submitted")).toBeLessThan(
      order.indexOf("revoke_refunded_analysis_entitlement"),
    );
    expect(refundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "polar-order-1", amount: 19_900, revokeBenefits: true }),
      expect.anything(),
    );
  });

  it("환불할 것이 없으면 폴라를 부르지 않는다", async () => {
    rpc.mockResolvedValue({ data: { disposition: "FAILED_WITHOUT_ORDER" }, error: null });

    expect(await call()).toEqual({ disposition: "NOT_REFUNDED", reason: "FAILED_WITHOUT_ORDER" });
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it("재시도가 남았으면 아무것도 하지 않는다", async () => {
    rpc.mockResolvedValue({ data: { disposition: "RETRYABLE" }, error: null });

    expect(await call()).toEqual({ disposition: "NOT_REFUNDED", reason: "RETRYABLE" });
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it("폴라가 실패하면 주문을 UNCERTAIN으로 두고 던진다", async () => {
    // 접수됐는지조차 모르는 상태입니다. 이 표시가 있으면 두 경로 모두 다시
    // 환불하지 않습니다 — 모르는 채로 한 번 더 부르는 것이 더 나쁩니다.
    rpc.mockImplementation((name: string) => {
      if (name === "claim_quick_analysis_failure_refund") return Promise.resolve({ data: CLAIM, error: null });
      return Promise.resolve({ data: null, error: null });
    });
    refundsCreate.mockRejectedValue(new Error("POLAR_DOWN"));

    await expect(call()).rejects.toThrow("POLAR_DOWN");
    expect(rpc.mock.calls.map(([name]) => name as string)).toContain("mark_quick_auto_refund_uncertain");
  });

  it("회수만 실패하면 환불된 것으로 답한다", async () => {
    // 여기서 던지면 바깥이 다시 환불하려 듭니다. 돈은 이미 나갔습니다.
    rpc.mockImplementation((name: string) => {
      if (name === "claim_quick_analysis_failure_refund") return Promise.resolve({ data: CLAIM, error: null });
      if (name === "revoke_refunded_analysis_entitlement") return Promise.resolve({ data: null, error: { code: "PGRST" } });
      return Promise.resolve({ data: null, error: null });
    });

    expect(await call()).toMatchObject({ disposition: "REFUNDED", entitlementsRevoked: 0 });
  });
});

describe("돌려줄 수 있는 금액", () => {
  it("폴라가 말하는 만큼만 환불한다", async () => {
    // 저장해 둔 금액은 totalAmount라 수수료·세금까지 들어 있습니다. 그대로
    // 보냈다가 "Refund amount exceeds refundable amount"로 거절당하면 손님은
    // 한 푼도 못 돌려받습니다.
    rpc.mockImplementation((name: string) => {
      if (name === "claim_quick_analysis_failure_refund") return Promise.resolve({ data: CLAIM, error: null });
      if (name === "revoke_refunded_analysis_entitlement") return Promise.resolve({ data: 1, error: null });
      return Promise.resolve({ data: null, error: null });
    });
    ordersGet.mockResolvedValue({ refundableAmount: 17_500 });

    await refundExhaustedRun({ analysisRunId: "run-1", ownerUserId: "user-1" });

    expect(refundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 17_500 }),
      expect.anything(),
    );
  });

  it("돌려줄 것이 없으면 폴라를 부르지 않고 UNCERTAIN으로 둔다", async () => {
    rpc.mockImplementation((name: string) => {
      if (name === "claim_quick_analysis_failure_refund") return Promise.resolve({ data: CLAIM, error: null });
      return Promise.resolve({ data: null, error: null });
    });
    ordersGet.mockResolvedValue({ refundableAmount: 0 });

    await expect(refundExhaustedRun({ analysisRunId: "run-1", ownerUserId: "user-1" })).rejects.toThrow("POLAR_NOTHING_REFUNDABLE");
    expect(refundsCreate).not.toHaveBeenCalled();
    expect(rpc.mock.calls.map(([name]) => name as string)).toContain("mark_quick_auto_refund_uncertain");
  });
});
