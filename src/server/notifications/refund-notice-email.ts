import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { RefundSummary } from "./run-failure-alert-email";

/**
 * 환불했다는 사실을 **손님에게** 알립니다.
 *
 * 지금까지 이 사실이 가는 곳은 두 군데뿐이었습니다: 관리자 메일과, 결제 복귀
 * 화면. 관리자 메일은 손님이 못 보고, 복귀 화면은 **창을 닫으면 사라집니다.**
 *
 * 그래서 이런 일이 생깁니다 — 분석이 실패하고, 우리는 전액 환불했고, 손님은
 * 창을 닫았습니다. 며칠 뒤 카드값에서 결제 내역을 보고 "돈만 나갔다"고
 * 생각합니다. 환불된 것을 확인할 방법이 손님에게 없습니다.
 *
 * 우리가 한 일을 우리가 말하지 않으면, 손님이 물어볼 수밖에 없습니다.
 *
 * **환불이 확실히 접수된 건에만 보냅니다.** 시도 중이거나 접수 여부를 모르는
 * 건에 "환불했습니다"라고 쓰면, 돌아오지 않은 돈을 돌아왔다고 말하는 것입니다.
 * 그건 아무 말도 하지 않는 것보다 나쁩니다.
 *
 * 실패해도 던지지 않습니다. 메일이 안 나가는 것보다 분석 실패 기록이
 * 어긋나는 쪽이 훨씬 나쁩니다.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type RefundNoticeDisposition =
  | "SENT"
  | "SKIPPED_NOT_REFUNDED"
  | "SKIPPED_NOT_CONFIGURED"
  | "SKIPPED_NO_ADDRESS"
  | "FAILED";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function formatAmount(amount: number, currency: string): string {
  return currency.toUpperCase() === "KRW"
    ? `${amount.toLocaleString("ko-KR")}원`
    : `${amount.toLocaleString("ko-KR")} ${currency.toUpperCase()}`;
}

export async function notifyRefundedApplicant(
  input: { ownerUserId: string; refund: RefundSummary },
  fetchImplementation: typeof fetch = fetch,
): Promise<{ disposition: RefundNoticeDisposition; detail?: string }> {
  // 환불되지 않은 건에는 아무 말도 하지 않습니다.
  if (input.refund.disposition !== "REFUNDED") return { disposition: "SKIPPED_NOT_REFUNDED" };

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ANALYSIS_EMAIL_FROM?.trim();
  if (!apiKey || !from) return { disposition: "SKIPPED_NOT_CONFIGURED" };
  const replyTo = process.env.ANALYSIS_EMAIL_REPLY_TO?.trim();

  const client = serviceClient();
  if (!client) return { disposition: "SKIPPED_NOT_CONFIGURED" };

  // 주소를 못 찾으면 보낼 곳이 없습니다. 관리자 알림은 따로 나가므로 여기서
  // 조용히 멈춰도 이 건이 묻히지는 않습니다.
  let to = "";
  try {
    const { data } = await client.auth.admin.getUserById(input.ownerUserId);
    to = data.user?.email ?? "";
  } catch {
    // 그대로 둡니다.
  }
  if (!to) return { disposition: "SKIPPED_NO_ADDRESS" };

  // 손님이 실제로 결제한 금액입니다(세금 포함). 폴라에 보낸 숫자는 세전
  // 금액이라 8,000처럼 보이는데, 그 값을 여기 적으면 카드 내역과 어긋나
  // "800원이 덜 돌아왔다"고 읽힙니다.
  const amount = formatAmount(input.refund.amount, input.refund.currency);

  const response = await fetchImplementation(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      from: `MOOA Resume <${from}>`,
      ...(replyTo ? { reply_to: replyTo } : {}),
      to: [to],
      subject: `분석을 완료하지 못해 ${amount}을 전액 환불했습니다`,
      text: [
        "자기소개서 분석을 끝내 드리지 못했습니다. 죄송합니다.",
        "",
        `결제하신 ${amount}은 전액 환불 처리했습니다. 따로 문의하지 않으셔도 됩니다.`,
        "카드사에 따라 실제 반영까지 3~5영업일 걸릴 수 있습니다.",
        "",
        "다시 시도하셔도 추가로 청구되지 않습니다.",
        ...(replyTo ? ["", `궁금한 점은 이 메일에 그대로 답장해 주세요. (${replyTo})`] : []),
      ].join("\n"),
      html: `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#16241d">
<p style="font-size:15px;line-height:1.7">자기소개서 분석을 끝내 드리지 못했습니다. 죄송합니다.</p>
<div style="margin:22px 0;padding:16px 18px;border-radius:12px;background:#f2f7f4;border:1px solid #dbe7e0">
<p style="margin:0;font-size:15px;font-weight:700">결제하신 ${amount}은 전액 환불했습니다.</p>
<p style="margin:8px 0 0;color:#68756f;font-size:13px;line-height:1.7">따로 문의하지 않으셔도 됩니다. 카드사에 따라 실제 반영까지 3~5영업일 걸릴 수 있습니다.</p>
</div>
<p style="color:#68756f;font-size:13px;line-height:1.7">다시 시도하셔도 추가로 청구되지 않습니다.${replyTo ? " 궁금한 점은 이 메일에 그대로 답장해 주세요." : ""}</p>
</div>`,
    }),
  });

  if (!response.ok) return { disposition: "FAILED", detail: `RESEND_${response.status}` };
  return { disposition: "SENT" };
}
