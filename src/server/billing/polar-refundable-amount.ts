import "server-only";

import type { Polar } from "@polar-sh/sdk";

/**
 * 폴라가 실제로 돌려줄 수 있는 금액.
 *
 * `billing_orders.amount`에는 주문의 `totalAmount`(세금·수수료까지 더한 값)를
 * 넣어 둡니다. 그런데 폴라가 환불할 수 있는 것은 그 값이 아닙니다 — 결제
 * 수수료처럼 이미 빠져나간 몫은 돌려줄 수 없고, 일부를 먼저 환불했다면 그만큼
 * 더 줄어듭니다.
 *
 * 그래서 저장해 둔 금액을 그대로 보내면 이런 답이 옵니다:
 *
 *     "Refund amount exceeds refundable amount", input: 8800
 *
 * 그러면 환불이 통째로 실패하고 주문에는 `UNCERTAIN` 표시만 남습니다. 손님은
 * 돈을 못 돌려받고, 우리는 그 사실을 메일로만 알게 됩니다.
 *
 * 우리가 계산해서 맞히려 들지 않습니다. 얼마를 돌려줄 수 있는지는 폴라가 알고
 * 있고 `refundableAmount`로 알려 줍니다. 물어보고 그 값을 씁니다.
 */
export async function resolveRefundableAmount(
  polar: Polar,
  providerOrderId: string,
  requestedAmount: number,
): Promise<number> {
  const order = await polar.orders.get({ id: providerOrderId }, { timeoutMs: 10_000 });
  const refundable = typeof order.refundableAmount === "number" ? order.refundableAmount : 0;
  // 요청한 금액보다 더 돌려주지는 않습니다. 저장된 금액이 상한이고, 폴라가
  // 그보다 적게 줄 수 있다고 하면 그쪽을 따릅니다.
  return Math.max(0, Math.min(requestedAmount, refundable));
}
