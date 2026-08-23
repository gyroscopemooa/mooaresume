import "server-only";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type ManualEmailInput = { to: string[]; subject: string; body: string; replyTo?: string };

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

/**
 * Sends one message to each recipient.
 *
 * Putting several addresses in a single `to` would show every recipient the
 * whole list, which is not something to do to a class or a department by
 * accident. One request each keeps them from seeing one another.
 *
 * Failures are collected rather than thrown on the first one: with ten
 * recipients, stopping at the third leaves the operator unable to tell who
 * received it, and re-sending would double up on the first two.
 */
export async function sendManualEmail(input: ManualEmailInput, fetchImplementation: typeof fetch = fetch) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = (process.env.MAIL_FROM || process.env.ANALYSIS_EMAIL_FROM)?.trim();
  if (!apiKey || !from) throw new Error("메일 발송 환경변수가 설정되지 않았습니다.");
  // The sender is a noreply address, so without this a reply goes nowhere
  // anyone reads. Leaving it to be typed each time means the one message
  // someone forgets is the one that loses a reply.
  const replyTo = input.replyTo?.trim() || process.env.ANALYSIS_EMAIL_REPLY_TO?.trim();
  const body = input.body.trim();
  const subject = input.subject.trim();
  const html = `<div style="white-space:pre-wrap;font-family:Arial,sans-serif;line-height:1.7">${escapeHtml(body)}</div>`;

  const sent: string[] = [];
  const failed: Array<{ to: string; reason: string }> = [];

  for (const to of input.to) {
    try {
      const response = await fetchImplementation(RESEND_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({ from: `MOOA Resume <${from}>`, to: [to], subject, text: body, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
      });
      if (response.ok) sent.push(to);
      else failed.push({ to, reason: `RESEND_${response.status}` });
    } catch (error) {
      failed.push({ to, reason: error instanceof Error ? error.message : "UNKNOWN_ERROR" });
    }
  }

  if (sent.length === 0) throw new Error(failed[0]?.reason ?? "RESEND_NO_RECIPIENTS");
  return { sent, failed };
}
