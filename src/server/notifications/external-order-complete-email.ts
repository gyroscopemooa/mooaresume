import "server-only";

import type { EmailDisposition } from "./analysis-complete-email";

export type ExternalOrderEmailInput = {
  to: string;
  product: "QUICK" | "PRO" | "FINAL";
  resultUrl: string;
  requestId: string;
  customerName?: string;
  salesChannel?: string;
  orderNumber?: string;
  paidAmountKrw?: number;
  company?: string;
  role?: string;
  completedAt?: string;
  expiresAt?: string;
  feedbackUrl?: string;
};

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// Only server-generated, first-party URLs are accepted. Never turn an
// admin-entered arbitrary URL into a branded customer access link.
function safeUrl(value: string, prefix: string) {
  const url = new URL(value);
  if (url.origin !== "https://mooaresume.com" || !url.pathname.startsWith(prefix)
      || url.username || url.password || url.hash) throw new Error("INVALID_EXTERNAL_EMAIL_URL");
  return url.href;
}
function koreanDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("INVALID_EXTERNAL_EMAIL_DATE");
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(date);
}

export function buildExternalOrderEmail(input: ExternalOrderEmailInput) {
  const resultUrl = safeUrl(input.resultUrl, "/result/external/");
  const feedbackUrl = input.feedbackUrl ? safeUrl(input.feedbackUrl, "/feedback/external/") : undefined;
  if (input.paidAmountKrw !== undefined && (!Number.isSafeInteger(input.paidAmountKrw) || input.paidAmountKrw < 0)) throw new Error("INVALID_EXTERNAL_EMAIL_AMOUNT");
  const name = input.customerName?.trim();
  const greeting = name ? `${name} 고객님, 안녕하세요.` : "안녕하세요, 무아레쥬메입니다.";
  const expiry = koreanDate(input.expiresAt);
  const rows: Array<[string, string | undefined]> = [
    ["구매처", input.salesChannel?.trim()],
    ["상품주문번호", input.orderNumber?.trim()],
    ["구매 상품", `${input.product} 자기소개서 분석`],
    ["결제 금액", input.paidAmountKrw === undefined ? undefined : `${input.paidAmountKrw.toLocaleString("ko-KR")}원`],
    ["지원 기업", input.company?.trim()],
    ["지원 직무", input.role?.trim()],
    ["분석 완료일", koreanDate(input.completedAt)],
    ["진행 상태", "분석 완료"],
  ];
  const visibleRows = rows.filter((row): row is [string, string] => Boolean(row[1]));
  const notice = "회원가입 및 추가 결제 없이 고객 전용 링크에서 결과를 확인할 수 있습니다. 개인정보 보호를 위해 링크를 타인에게 공유하지 마세요.";
  const expiryNotice = expiry ? `열람 기간: ${expiry} (한국 시간)까지` : "";
  const subject = `[무아레쥬메] ${input.product} 자기소개서 분석이 완료되었습니다.`;
  const text = [
    greeting, "", "신청하신 자기소개서 분석 및 첨삭이 완료되었습니다.", "",
    ...visibleRows.map(([label, value]) => `${label}: ${value}`), "",
    "자기소개서 분석 결과 확인하기", resultUrl, "", notice,
    ...(expiryNotice ? [expiryNotice] : []),
    ...(feedbackUrl ? ["", "분석 후기 남기기", feedbackUrl] : []),
    "", "감사합니다.", "무아레쥬메 드림",
  ].join("\n");
  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#16241d;max-width:560px;margin:auto;line-height:1.7">
<h2 style="color:#176b4a">MOOA RESUME</h2><h3>자기소개서 분석이 완료되었습니다.</h3>
<p>${escapeHtml(greeting)}</p><p>신청하신 자기소개서 분석 및 첨삭이 완료되었습니다.</p>
<table style="width:100%;border-collapse:collapse;border:1px solid #e2eae6"><tbody>${visibleRows.map(([label,value]) => `<tr><th scope="row" style="text-align:left;padding:9px;color:#68756f;border-bottom:1px solid #e2eae6">${escapeHtml(label)}</th><td style="padding:9px;border-bottom:1px solid #e2eae6">${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>
<p style="margin:24px 0"><a href="${escapeHtml(resultUrl)}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#176b4a;color:#fff;font-weight:700;text-decoration:none">자기소개서 분석 결과 확인하기</a></p>
<p style="color:#68756f;font-size:13px">${escapeHtml(notice)}${expiryNotice ? `<br>${escapeHtml(expiryNotice)}` : ""}</p>
${feedbackUrl ? `<div style="border-top:1px solid #e2eae6;margin-top:24px;padding-top:16px"><p>이번 분석은 어떠셨나요?</p><a href="${escapeHtml(feedbackUrl)}" style="display:inline-block;padding:11px 20px;border:1px solid #176b4a;border-radius:10px;color:#176b4a;text-decoration:none">분석 후기 남기기</a></div>` : ""}
<p>감사합니다.<br>무아레쥬메 드림</p></div>`;
  return { subject, text, html };
}

// A separate sender keeps the existing authenticated customer completion
// email unchanged. Call only after a completed run and guest grant exist.
export async function sendExternalOrderCompleteEmail(input: ExternalOrderEmailInput, fetchImplementation: typeof fetch = fetch): Promise<{ disposition: EmailDisposition; detail?: string; messageId?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ANALYSIS_EMAIL_FROM?.trim();
  const replyTo = process.env.ANALYSIS_EMAIL_REPLY_TO?.trim();
  if (!key || !from) return { disposition: "SKIPPED_NOT_CONFIGURED" };
  try {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(input.requestId)) throw new Error("INVALID_EXTERNAL_EMAIL_REQUEST_ID");
    const mail = buildExternalOrderEmail(input);
    const response = await fetchImplementation("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `external-order/${input.requestId}` },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ from: `MOOA Resume <${from}>`, ...(replyTo ? { reply_to: replyTo } : {}), to: [input.to], ...mail }),
    });
    if (!response.ok) return { disposition: "FAILED", detail: `RESEND_${response.status}` };
    const payload = await response.json().catch(() => null) as { id?: string } | null;
    return { disposition: "SENT", ...(payload?.id ? { messageId: payload.id } : {}) };
  } catch {
    return { disposition: "FAILED", detail: "EXTERNAL_ORDER_EMAIL_FAILED" };
  }
}
