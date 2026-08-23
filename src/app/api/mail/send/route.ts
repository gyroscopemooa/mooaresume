import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendManualEmail } from "@/server/notifications/manual-email";
import { recordMailSends } from "@/server/admin/admin-repository";
import { MAX_RECIPIENTS, parseRecipientList } from "@/domain/recipient-list";

const inputSchema = z.object({ to: z.string().trim().min(1).max(4_000), subject: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(50_000), replyTo: z.string().trim().email().max(254).optional().or(z.literal("")) });

export async function POST(request: Request) {
  const secret = process.env.MAIL_ADMIN_SECRET?.trim();
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)mooa_mail_admin=([^;]+)/)?.[1];
  if (!secret || cookie !== secret) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "받는 사람, 제목, 본문을 확인해 주세요." }, { status: 400 });
  // Validated before anything is sent: a bad address halfway down the list
  // would otherwise leave a partial send that cannot be undone.
  const recipients = parseRecipientList(parsed.data.to);
  if (!recipients.ok) {
    const error = recipients.reason === "too_many"
      ? `받는 사람은 한 번에 ${MAX_RECIPIENTS}명까지 가능합니다.`
      : recipients.reason === "invalid"
        ? `이메일 형식이 아닌 주소가 있습니다: ${recipients.invalid?.join(", ")}`
        : "받는 사람을 입력해 주세요.";
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const result = await sendManualEmail({ ...parsed.data, to: recipients.recipients });
    // Recorded per recipient so the console can answer "who actually got it"
    // later. Awaited but never fatal — see recordMailSends.
    await recordMailSends({
      batchId: randomUUID(),
      subject: parsed.data.subject,
      replyTo: parsed.data.replyTo || null,
      sent: result.sent,
      failed: result.failed.map((item) => ({ to: item.to, error: item.reason })),
    });
    if (result.failed.length > 0) {
      console.error("manual_email_partial", JSON.stringify(result.failed));
      // Naming who did not get it is the point — the operator needs to know
      // exactly who to retry without sending twice to everyone else.
      return NextResponse.json({
        ok: true,
        sent: result.sent.length,
        failedRecipients: result.failed.map((item) => item.to),
      });
    }
    return NextResponse.json({ ok: true, sent: result.sent.length });
  }
  catch (error) { console.error("manual_email_failed", error instanceof Error ? error.message : "UNKNOWN_ERROR"); return NextResponse.json({ error: "메일을 보내지 못했습니다. Resend 설정과 발신 도메인을 확인해 주세요." }, { status: 502 }); }
}
