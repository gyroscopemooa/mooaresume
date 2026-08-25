import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { issueRewardCredits } from "@/server/admin/admin-repository";
import { MAX_RECIPIENTS, parseRecipientList } from "@/domain/recipient-list";
import { createClaimToken, rewardCreditProductSchema, rewardCreditReasonSchema } from "@/domain/reward-credit";

const inputSchema = z.object({
  to: z.string().trim().min(1).max(4_000),
  product: rewardCreditProductSchema,
  reason: rewardCreditReasonSchema,
  note: z.string().trim().max(500).optional().or(z.literal("")),
  allowedCharacters: z.number().int().min(1_000).max(100_000),
  expiresAt: z.string().trim().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const secret = process.env.MAIL_ADMIN_SECRET?.trim();
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)mooa_mail_admin=([^;]+)/)?.[1];
  if (!secret || cookie !== secret) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "입력 내용을 확인해 주세요." }, { status: 400 });

  // The same list rules the mail composer uses: duplicates removed, every
  // address checked before anything is written. Issuing a credit twice to one
  // person is giving away a second analysis.
  const recipients = parseRecipientList(parsed.data.to);
  if (!recipients.ok) {
    const error = recipients.reason === "too_many"
      ? `한 번에 ${MAX_RECIPIENTS}명까지 발급할 수 있습니다.`
      : recipients.reason === "invalid"
        ? `이메일 형식이 아닌 주소가 있습니다: ${recipients.invalid?.join(", ")}`
        : "받는 사람을 입력해 주세요.";
    return NextResponse.json({ error }, { status: 400 });
  }

  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "만료일을 확인해 주세요." }, { status: 400 });
  }

  const result = await issueRewardCredits({
    emails: recipients.recipients,
    product: parsed.data.product,
    reason: parsed.data.reason,
    note: parsed.data.note || null,
    allowedCharacters: parsed.data.allowedCharacters,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    // Generated here, never in the browser: this token is the entire
    // authorisation to take the credit.
    tokens: recipients.recipients.map(() => createClaimToken((size) => new Uint8Array(randomBytes(size)))),
  });

  if (result.error) {
    console.error("reward_credit_issue_failed", result.error);
    return NextResponse.json({ error: "이용권을 발급하지 못했습니다." }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    issued: result.issued.map((credit) => ({ email: credit.recipientEmail, token: credit.claimToken })),
  });
}
