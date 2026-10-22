import "server-only";
import { serviceClient } from "@/server/admin/admin-repository";

export type ExtraReviewSend = { recipient: string; sentAt: string; previewId: string | null; ok: boolean };

/** 추가 첨삭 메일 발송 기록. 메일 본문의 후기 링크(/feedback/<runId>)로 이 실행의 메일만 고른다. */
export async function listExtraReviewSends(runId: string): Promise<ExtraReviewSend[]> {
  const result = await serviceClient().from("mail_send_log").select("recipient,status,sent_at,body")
    .ilike("body", `%/feedback/${runId}%`).ilike("body", "%/result/second-review/%")
    .order("sent_at", { ascending: false }).limit(20);
  if (result.error) return [];
  return (result.data ?? []).map(row => {
    const token = String(row.body ?? "").match(/second-review\/([A-Za-z0-9_-]+)\./)?.[1];
    let previewId: string | null = null;
    try { previewId = token ? (JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as { preview?: string }).preview ?? null : null; } catch { previewId = null; }
    return { recipient: String(row.recipient), sentAt: String(row.sent_at), previewId, ok: row.status !== "FAILED" };
  });
}

/** 목록용: 실행별로 추가 첨삭 메일을 받은 주소들(성공한 발송만). */
export async function listExtraReviewRecipientsByRun(): Promise<Record<string, string[]>> {
  const result = await serviceClient().from("mail_send_log").select("recipient,status,body")
    .ilike("body", "%/result/second-review/%").neq("status", "FAILED").order("sent_at", { ascending: false }).limit(500);
  if (result.error) return {};
  const byRun: Record<string, string[]> = {};
  for (const row of result.data ?? []) {
    const token = String(row.body ?? "").match(/second-review\/([A-Za-z0-9_-]+)\./)?.[1];
    try {
      const run = token ? (JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as { run?: string }).run : undefined;
      if (run) (byRun[run] ??= []).push(String(row.recipient).toLowerCase());
    } catch { /* not a delivery token */ }
  }
  return byRun;
}
