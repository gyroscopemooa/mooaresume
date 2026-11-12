import { isAdminRequest } from "@/server/admin/admin-session";
import { buildNicepayReviewFields, nicepayReviewConfigured, nicepayReviewHtml, nicepayReviewRequestSchema, renderNicepayReview } from "@/server/billing/nicepay-review";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return nicepayReviewHtml("관리자 로그인이 필요합니다.", 401);
  const url = new URL(request.url);
  if (request.headers.get("origin") !== url.origin) return nicepayReviewHtml("허용되지 않은 출처입니다.", 403);
  if (!nicepayReviewConfigured()) return nicepayReviewHtml("NICE 연결 확인 설정이 준비되지 않았습니다.", 503);
  if (Number(request.headers.get("content-length") ?? 0) > 1024) return nicepayReviewHtml("요청이 너무 큽니다.", 413);
  const body = await request.text();
  if (body.length > 1024) return nicepayReviewHtml("요청이 너무 큽니다.", 413);
  const parsed = nicepayReviewRequestSchema.safeParse(Object.fromEntries(new URLSearchParams(body)));
  if (!parsed.success) return nicepayReviewHtml("상품과 연결 확인 수단을 다시 선택해 주세요.", 400);
  const fields = buildNicepayReviewFields({ request: parsed.data, origin: url.origin, config: {
    mid: process.env.NICEPAY_REVIEW_MID!, merchantKey: process.env.NICEPAY_REVIEW_MERCHANT_KEY!,
  } });
  return nicepayReviewHtml(renderNicepayReview(fields));
}
