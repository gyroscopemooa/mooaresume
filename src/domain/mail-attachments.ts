/**
 * Files hung on a manual admin mail.
 *
 * The console could only send words. Anything with a picture in it — an event
 * poster, a one-page guide, a screenshot of what to click — had to be sent from
 * a personal mail client instead, which meant the send was not logged and did
 * not go out on the verified sending domain.
 *
 * The limits live here rather than in the route so the form can refuse a file
 * before uploading it. A 9MB file rejected after a 40-second upload is a worse
 * answer than the same rejection given the moment it is picked.
 */

/** One message is sent per recipient, so this size goes out once per person. */
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS_TOTAL_BYTES = 10 * 1024 * 1024;

/** Shown inside the body when asked for; everything else rides along as a plain file. */
const INLINE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export type AttachmentCandidate = { name: string; type: string; size: number };

export type AttachmentCheck =
  | { ok: true }
  | { ok: false; reason: "too_many" | "empty_file" | "too_large" | "total_too_large"; offender?: string };

export function isInlineImage(contentType: string): boolean {
  return INLINE_IMAGE_TYPES.has(contentType.toLowerCase().split(";")[0].trim());
}

export function checkAttachments(files: AttachmentCandidate[]): AttachmentCheck {
  if (files.length > MAX_ATTACHMENTS) return { ok: false, reason: "too_many" };

  // An empty file is almost always a pick that went wrong (a folder, a file
  // still syncing). Sending it silently would look like the attachment worked.
  const empty = files.find((file) => file.size === 0);
  if (empty) return { ok: false, reason: "empty_file", offender: empty.name };

  const oversized = files.find((file) => file.size > MAX_ATTACHMENT_BYTES);
  if (oversized) return { ok: false, reason: "too_large", offender: oversized.name };

  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_ATTACHMENTS_TOTAL_BYTES) return { ok: false, reason: "total_too_large" };

  return { ok: true };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
}

export function attachmentCheckMessage(check: Extract<AttachmentCheck, { ok: false }>): string {
  switch (check.reason) {
    case "too_many":
      return `첨부파일은 한 번에 ${MAX_ATTACHMENTS}개까지 넣을 수 있습니다.`;
    case "empty_file":
      return `내용이 비어 있는 파일은 보낼 수 없습니다: ${check.offender}`;
    case "too_large":
      return `파일 하나는 ${formatBytes(MAX_ATTACHMENT_BYTES)}까지 가능합니다: ${check.offender}`;
    case "total_too_large":
      return `첨부파일을 모두 합쳐 ${formatBytes(MAX_ATTACHMENTS_TOTAL_BYTES)}까지 가능합니다.`;
  }
}

/**
 * Keeps a picked name from becoming a path.
 *
 * The name is copied into a mail header and then onto whatever machine opens
 * it, so directory parts, quotes, and control characters come off here.
 */
export function safeAttachmentName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f"]/g, "").trim();
  return (cleaned || "attachment").slice(0, 120);
}
