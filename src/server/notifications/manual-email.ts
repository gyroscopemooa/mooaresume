import "server-only";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type ManualEmailAttachment = {
  filename: string;
  contentType: string;
  content: Uint8Array;
  /** Image shown inside the body instead of only sitting at the bottom as a file. */
  inline?: boolean;
};

export type ManualEmailInput = { to: string[]; subject: string; body: string; replyTo?: string; attachments?: ManualEmailAttachment[] };

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

/**
 * Resend takes attachment bytes as base64 in the JSON body.
 *
 * `btoa` rather than `Buffer` because this also runs on the Cloudflare
 * runtime, and the string is built in chunks because spreading a few million
 * bytes into `String.fromCharCode` at once overflows the argument list.
 */
function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK));
  }
  return btoa(binary);
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

  // Encoded once, not once per recipient: with 50 addresses and a 5MB poster
  // that is the difference between one base64 pass and fifty.
  const files = (input.attachments ?? []).map((file, index) => ({
    filename: file.filename,
    content: toBase64(file.content),
    content_type: file.contentType,
    ...(file.inline ? { content_id: `mooa-inline-${index + 1}` } : {}),
  }));
  // `cid:` is how a mail client finds a picture that travels with the message;
  // an <img src="https://..."> would need the file hosted somewhere public, and
  // a data: URI is stripped by Gmail. Clients that ignore the reference still
  // show the same picture in the attachment row, so nothing is lost either way.
  const inlineImages = files
    .filter((file) => file.content_id)
    .map((file) => `<div style="margin-top:16px"><img src="cid:${file.content_id}" alt="${escapeHtml(file.filename)}" style="max-width:100%;height:auto;border-radius:6px" /></div>`)
    .join("");
  const html = `<div style="white-space:pre-wrap;font-family:Arial,sans-serif;line-height:1.7">${escapeHtml(body)}</div>${inlineImages}`;

  const sent: string[] = [];
  const failed: Array<{ to: string; reason: string }> = [];
  // 제공자가 준 식별자. 이것이 없으면 "보냈다는데 안 왔다"를 확인할 방법이
  // 없습니다 — 우리 기록은 "요청을 넘겼다"까지이고, 그 뒤 배달 여부는
  // Resend 대시보드에 있습니다. 그 둘을 잇는 값입니다.
  const messageIds: Record<string, string> = {};

  for (const to of input.to) {
    try {
      const response = await fetchImplementation(RESEND_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        // A 5MB attachment on a slow line needs longer than a text-only send.
        signal: AbortSignal.timeout(files.length > 0 ? 60_000 : 15_000),
        body: JSON.stringify({ from: `MOOA Resume <${from}>`, to: [to], subject, text: body, html, ...(replyTo ? { reply_to: replyTo } : {}), ...(files.length > 0 ? { attachments: files } : {}) }),
      });
      if (response.ok) {
        sent.push(to);
        // 식별자를 못 읽는 것과 발송이 실패한 것은 다릅니다. 여기서 새어 나간
        // 예외가 아래 catch로 떨어지면, 이미 보낸 메일이 실패로 기록됩니다.
        try {
          const payload = await response.json() as { id?: string } | null;
          if (payload?.id) messageIds[to] = payload.id;
        } catch {
          // 발송은 성공했습니다. 식별자만 비워 둡니다.
        }
      } else {
        failed.push({ to, reason: `RESEND_${response.status}` });
      }
    } catch (error) {
      failed.push({ to, reason: error instanceof Error ? error.message : "UNKNOWN_ERROR" });
    }
  }

  if (sent.length === 0) throw new Error(failed[0]?.reason ?? "RESEND_NO_RECIPIENTS");
  return { sent, failed, messageIds };
}
