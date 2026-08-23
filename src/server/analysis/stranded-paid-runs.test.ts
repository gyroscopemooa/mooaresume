import { describe, expect, it } from "vitest";
import { selectStrandedPaidRuns, type ActiveEntitlement, type PendingRun } from "./stranded-paid-runs";

const NOW = Date.parse("2026-08-23T20:00:00Z");
const GRACE_MS = 2 * 60_000;
const LONG_AGO = "2026-08-23T18:00:00Z";

function entitlement(overrides: Partial<ActiveEntitlement> = {}): ActiveEntitlement {
  return {
    applicationCaseId: "case-1",
    ownerUserId: "owner-1",
    product: "QUICK",
    createdAt: LONG_AGO,
    ...overrides,
  };
}

function run(overrides: Partial<PendingRun> = {}): PendingRun {
  return {
    id: "run-1",
    applicationCaseId: "case-1",
    ownerUserId: "owner-1",
    product: "QUICK",
    createdAt: LONG_AGO,
    ...overrides,
  };
}

function select(input: {
  entitlements: ActiveEntitlement[];
  pendingRuns: PendingRun[];
  paidRunIds: string[];
  limit?: number;
}) {
  return selectStrandedPaidRuns({
    entitlements: input.entitlements,
    pendingRuns: input.pendingRuns,
    paidRunIds: input.paidRunIds,
    now: NOW,
    graceMs: GRACE_MS,
    limit: input.limit ?? 3,
  });
}

describe("결제됐지만 시작되지 않은 분석 고르기", () => {
  it("결제가 끝난 뒤 방치된 PENDING 실행을 집어낸다", () => {
    // The 19:34 case: order PAID, entitlement ACTIVE, run still PENDING
    // because the customer closed the tab before the webhook landed.
    const selected = select({
      entitlements: [entitlement()],
      pendingRuns: [run()],
      paidRunIds: ["run-1"],
    });

    expect(selected.map((item) => item.id)).toEqual(["run-1"]);
  });

  it("결제 흔적이 없는 PENDING 실행은 건드리지 않는다", () => {
    // Most PENDING runs are abandoned checkouts. Starting one would spend an
    // entitlement the applicant bought for a different snapshot.
    const selected = select({
      entitlements: [entitlement()],
      pendingRuns: [run({ id: "abandoned" }), run({ id: "run-1" })],
      paidRunIds: ["run-1"],
    });

    expect(selected.map((item) => item.id)).toEqual(["run-1"]);
  });

  it("방금 들어온 결제는 결제-복귀 화면에 먼저 양보한다", () => {
    const selected = select({
      entitlements: [entitlement({ createdAt: new Date(NOW - 30_000).toISOString() })],
      pendingRuns: [run()],
      paidRunIds: ["run-1"],
    });

    expect(selected).toEqual([]);
  });

  it("이용권 한 장을 두 실행에 나눠 주지 않는다", () => {
    // Same case, two paid-looking PENDING runs, one payment. Handing both to
    // begin_quick_analysis would just make the second one fail.
    const selected = select({
      entitlements: [entitlement()],
      pendingRuns: [run({ id: "run-1" }), run({ id: "run-2", createdAt: "2026-08-23T19:00:00Z" })],
      paidRunIds: ["run-1", "run-2"],
    });

    expect(selected.map((item) => item.id)).toEqual(["run-1"]);
  });

  it("이용권이 두 장이면 두 실행 모두 집어낸다", () => {
    const selected = select({
      entitlements: [entitlement(), entitlement()],
      pendingRuns: [run({ id: "run-1" }), run({ id: "run-2", createdAt: "2026-08-23T19:00:00Z" })],
      paidRunIds: ["run-1", "run-2"],
    });

    expect(selected.map((item) => item.id)).toEqual(["run-1", "run-2"]);
  });

  it("이용권의 상품·주인이 다르면 짝지어 주지 않는다", () => {
    // begin_quick_analysis matches case + owner + product; a PRO entitlement
    // cannot start a QUICK run, and neither can someone else's.
    const selected = select({
      entitlements: [entitlement({ product: "PRO" }), entitlement({ ownerUserId: "owner-2" })],
      pendingRuns: [run()],
      paidRunIds: ["run-1"],
    });

    expect(selected).toEqual([]);
  });

  it("오래 기다린 순서대로, 한 번에 정해진 개수만 집어낸다", () => {
    const selected = select({
      entitlements: [entitlement({ applicationCaseId: "case-1" }), entitlement({ applicationCaseId: "case-2" }), entitlement({ applicationCaseId: "case-3" })],
      pendingRuns: [
        run({ id: "newest", applicationCaseId: "case-3", createdAt: "2026-08-23T19:50:00Z" }),
        run({ id: "oldest", applicationCaseId: "case-1", createdAt: "2026-08-21T09:00:00Z" }),
        run({ id: "middle", applicationCaseId: "case-2", createdAt: "2026-08-22T09:00:00Z" }),
      ],
      paidRunIds: ["newest", "oldest", "middle"],
      limit: 2,
    });

    expect(selected.map((item) => item.id)).toEqual(["oldest", "middle"]);
  });
});
