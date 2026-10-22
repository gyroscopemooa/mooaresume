import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/server/admin/admin-session";
import { getAdminAnalysisPreview } from "@/server/admin/admin-analysis-previews";
import { recordMailSends } from "@/server/admin/admin-repository";
import { recipientDigest, reviewedContentDigest, signSecondReviewGrant } from "@/server/second-review/grant";
import { sendManualEmail } from "@/server/notifications/manual-email";

const inputSchema = z.object({
  runId: z.string().uuid(), previewId: z.string().uuid(), to: z.string().email(),
  expires: z.number().int().positive(), requestId: z.string().uuid(),
  send: z.boolean().default(false),
}).strict();
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  if (!isAdminRequest(request)) return json({ error: "UNAUTHORIZED" }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "INVALID_ORIGIN" }, 403);
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return json({ error: "INVALID_REQUEST" }, 400);
  const { runId, previewId, expires, requestId, send } = input.data;
  const to = input.data.to.trim().toLowerCase();
  try {
    const preview = await getAdminAnalysisPreview(runId, previewId);
    if (!preview || !preview.revisedAnswers.every(answer => answer.section)) return json({ error: "REVIEW_NOT_READY" }, 409);
    const secret = process.env.SECOND_REVIEW_SIGNING_SECRET?.trim() ?? "";
    const token = signSecondReviewGrant({
      v: 1, run: runId, preview: previewId, expires,
      recipient: recipientDigest(to, secret), content: reviewedContentDigest(preview.revisedAnswers),
    }, secret);
    // No request-supplied host: never mail a localhost or attacker-controlled URL.
    const url = `https://mooaresume.com/result/second-review/${token}`;
    if (!send) return json({ url, expires });
    const subject = "[무아레쥬메] 다른 시각으로 본 추가 첨삭본을 전달드립니다";
    // 2026-10-22 운영자 지정 문구: 추가 첨삭은 1차보다 나은 판정이 아니라 다른 시각의 참고본이다.
    const body = `안녕하세요, 무아레쥬메입니다.

무아레쥬메는 24시간 내로 임의로 선별된 첨삭본을 다른 시각을 통해 추가 첨삭을 진행합니다.
이번에 전달드리는 건은 추가 첨삭된 건이며, 1차 첨삭보다 개선되었다는 의미가 아닙니다. 본인 스타일과 맞는 문장을 고르시거나, 두 첨삭본을 종합하여 판단하실 수 있도록 참고용 첨삭본으로 안내드립니다.

추가 첨삭본은 추가 비용 없이 제공되며, 별도 결제가 필요하지 않습니다.

아래에서 추가 첨삭본과 항목별 설명, 제출 전 확인 사항을 확인하실 수 있습니다.

추가 첨삭본 확인하기
${url}

메일을 받은 이메일 계정으로 로그인해 주세요. 다른 계정으로는 열람할 수 없습니다.
열람 링크는 ${new Date(expires).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}(한국 시간)까지 유효합니다.

더 나은 첨삭을 위한 안내
지원서의 요구사항과 본인의 경험이 더욱 효과적으로 반영될 수 있도록 참고 사항을 정리했습니다. 다음 첨삭 요청 시 활용해 주세요.

1. 지원서의 실제 질문을 문항별로 입력해 주세요. 지원동기·경험 등 소재 메모와 실제 지원서 문항은 다를 수 있습니다.
2. 문항별 글자 제한을 알려주세요. 가능하면 공백 포함 여부도 함께 적어주세요.
3. 경험은 근무처별로 구분해 주세요. 기간·맡은 업무·본인이 한 행동·결과를 나누면 경험이 섞이지 않게 검토하는 데 도움이 됩니다.
4. 확정되지 않은 정보는 ‘확인 필요’로 표시해 주세요. 추측해서 채우지 않으셔도 됩니다.
5. 채용공고와 지원서 양식이 있으면 함께 첨부해 주세요.

이용 후기를 들려주세요
추가 첨삭본이 도움이 되었나요? 이용 경험을 남겨주시면 서비스 개선에 참고하겠습니다.
후기 남기기: https://mooaresume.com/feedback/${runId}
이미 후기를 남기셨다면 다시 작성하지 않으셔도 됩니다.

감사합니다.
무아레쥬메 드림`;
    const result = await sendManualEmail({ to: [to], subject, body, idempotencyKey: requestId });
    await recordMailSends({
      batchId: requestId, subject, replyTo: null, body, sent: result.sent,
      failed: result.failed.map(item => ({ to: item.to, error: item.reason })),
      providerMessageIds: result.messageIds, campaignId: null, attachmentNames: [],
    });
    return json({ ok: true, sent: result.sent.length, messageId: result.messageIds[to] ?? null, url });
  } catch {
    // Never log the signed URL, recipient contents, or credentials.
    return json({ error: "DELIVERY_FAILED_RETRY_SAME_REQUEST" }, 502);
  }
}
