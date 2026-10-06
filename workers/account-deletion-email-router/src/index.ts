const DELETION_SUBJECT = "계정삭제요청";

function decodeMimeWord(charset: string, encoding: string, value: string): string {
  try {
    const binary = encoding.toLowerCase() === "b"
      ? atob(value)
      : value.replaceAll("_", " ").replace(/=([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return `=?${charset}?${encoding}?${value}?=`;
  }
}

export function decodeMimeHeader(value: string): string {
  return value
    .replace(/\?=\s+=\?/gu, "?==?")
    .replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_, charset: string, encoding: string, encoded: string) => (
      decodeMimeWord(charset, encoding, encoded)
    ));
}

export function isAccountDeletionSubject(subject: string): boolean {
  return subject.replace(/\s+/gu, "").includes(DELETION_SUBJECT);
}

async function fallbackMessageId(message: ForwardableEmailMessage): Promise<string> {
  const date = message.headers.get("date")?.trim() ?? "";
  const subject = decodeMimeHeader(message.headers.get("subject")?.trim() ?? "");
  const input = new TextEncoder().encode(`${message.from}\n${message.to}\n${date}\n${subject}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `cloudflare-${hex}`;
}

async function messageId(message: ForwardableEmailMessage): Promise<string> {
  return message.headers.get("message-id")?.trim() || fallbackMessageId(message);
}

export async function handleIncomingEmail(
  message: ForwardableEmailMessage,
  env: AccountDeletionEmailRouterEnv,
): Promise<void> {
  if (message.to.trim().toLowerCase() !== env.INBOUND_ADDRESS.toLowerCase()) {
    message.setReject("Unsupported recipient");
    return;
  }

  await message.forward(env.FORWARD_TO);
  const subject = decodeMimeHeader(message.headers.get("subject")?.trim() ?? "");
  if (!isAccountDeletionSubject(subject)) return;

  const response = await fetch(env.APP_WEBHOOK_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.INBOUND_SECRET}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messageId: await messageId(message),
      from: message.from.trim().toLowerCase(),
      to: message.to.trim().toLowerCase(),
      subject,
      authenticated: true,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`ACCOUNT_DELETION_WEBHOOK_${response.status}`);
}

export default {
  async email(message, env): Promise<void> {
    try {
      await handleIncomingEmail(message, env);
    } catch (error) {
      console.error(JSON.stringify({
        event: "account_deletion_email_processing_failed",
        reason: error instanceof Error ? error.message : "UNKNOWN",
      }));
      throw error;
    }
  },
} satisfies ExportedHandler<AccountDeletionEmailRouterEnv>;
