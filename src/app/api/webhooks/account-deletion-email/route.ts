import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAccountDeletionRequest } from "@/server/account/admin-account-deletion";

const inboundSchema = z.object({
  messageId: z.string().trim().min(1).max(500),
  from: z.string().trim().toLowerCase().email().max(254),
  subject: z.string().trim().max(500),
});

function authorized(request: Request): boolean {
  const expected = process.env.ACCOUNT_DELETION_INBOUND_SECRET?.trim();
  const header = request.headers.get("authorization");
  const candidate = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
/**
 * Normalized handoff for the mail provider/Email Worker. It records metadata
 * only: no mail body or attachment is copied into the product database.
 */
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  const parsed = inboundSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  if (!parsed.data.subject.replaceAll(" ", "").includes("계정삭제요청")) return NextResponse.json({ ignored: true });
  try {
    const deletionRequest = await createAccountDeletionRequest({
      requesterEmail: parsed.data.from,
      source: "EMAIL_WEBHOOK",
      sourceMessageId: parsed.data.messageId,
    });
    return NextResponse.json({ accepted: true, requestId: deletionRequest.id });
  } catch (error) {
    console.error("account_deletion_email_ingest_failed", error instanceof Error ? error.message : "UNKNOWN");
    return NextResponse.json({ error: "요청을 등록하지 못했습니다." }, { status: 500 });
  }
}
