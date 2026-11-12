import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { createCheckoutQuote } from "@/domain/usage-entitlement";

export const nicepayReviewRequestSchema = z.object({
  product: z.enum(["QUICK", "PRO", "FINAL"]),
  method: z.enum(["CARD", "KAKAO"]),
}).strict();

const configSchema = z.object({
  mid: z.string().regex(/^[A-Za-z0-9]{9}m$/),
  merchantKey: z.string().regex(/^[A-Za-z0-9+/]{80,100}={0,2}$/),
});

export function nicepayReviewConfigured(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.NICEPAY_REVIEW_ENABLED === "true" && configSchema.safeParse({
    mid: env.NICEPAY_REVIEW_MID, merchantKey: env.NICEPAY_REVIEW_MERCHANT_KEY,
  }).success;
}

export function buildNicepayReviewFields(input: {
  request: z.infer<typeof nicepayReviewRequestSchema>;
  config: { mid: string; merchantKey: string };
  origin: string;
  now?: Date;
}) {
  const config = configSchema.parse(input.config);
  const request = nicepayReviewRequestSchema.parse(input.request);
  const origin = new URL(input.origin).origin;
  // A base-price connection check, never a persisted customer order/quote.
  const amount = String(createCheckoutQuote(request.product, 1).totalPriceKrw);
  const ediDate = new Date((input.now ?? new Date()).getTime() + 9 * 3_600_000)
    .toISOString().replace(/\D/g, "").slice(0, 14);
  return {
    MID: config.mid,
    Moid: `mooaReview${randomBytes(16).toString("hex")}`,
    Amt: amount,
    GoodsName: `MOOA ${request.product} connection check`,
    PayMethod: "CARD",
    EdiDate: ediDate,
    CharSet: "utf-8",
    ReturnURL: `${origin}/api/meensoo/nicepay-review/return`,
    SignData: createHash("sha256").update(ediDate + config.mid + amount + config.merchantKey).digest("hex"),
    ...(request.method === "KAKAO" ? { DirectShowOpt: "CARD", DirectEasyPay: "E016" } : {}),
  };
}

export function escapeNicepayHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export function renderNicepayReview(fields: ReturnType<typeof buildNicepayReviewFields>): string {
  const hidden = Object.entries(fields).map(([name, value]) =>
    `<input type="hidden" name="${name}" value="${escapeNicepayHtml(value)}">`).join("");
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MOOA NICE 연결 확인</title><body style="font-family:sans-serif;max-width:640px;margin:40px auto;padding:20px;line-height:1.7"><h1>NICE 연결 확인 · 실제 구매 불가</h1><p>${escapeNicepayHtml(fields.GoodsName)} · 표시 금액 ${Number(fields.Amt).toLocaleString("ko-KR")}원</p><p>현재 상품 기본가로 결제창 연결만 확인합니다. 실제 주문·결제 승인·분석 이용권 지급은 하지 않습니다. 카드정보 입력이나 인증 완료를 진행하지 마세요.</p><form name="payForm" method="post" accept-charset="euc-kr" action="/api/meensoo/nicepay-review/return">${hidden}<button type="button" id="openNice">NICE 창 연결 확인</button></form><p id="status" role="status"></p><a href="/meensoo/payments/nicepay">관리자 검수로 돌아가기</a><script src="https://pg-web.nicepay.co.kr/v3/common/js/nicepay-pgweb.js"></script><script>function nicepaySubmit(){document.getElementById('status').textContent='연결 확인 전용입니다. 승인 요청을 전송하지 않습니다.'}function nicepayClose(){document.getElementById('status').textContent='창을 닫았습니다. 결제나 이용권 지급은 하지 않았습니다.'}document.getElementById('openNice').onclick=function(){if(typeof goPay==='function'){goPay(document.payForm)}else{document.getElementById('status').textContent='NICE SDK를 불러오지 못했습니다.'}};</script></body></html>`;
}

export function nicepayReviewHtml(body: string, status = 200): Response {
  return new Response(body, { status, headers: {
    "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "frame-ancestors 'none'; base-uri 'none'",
  } });
}
