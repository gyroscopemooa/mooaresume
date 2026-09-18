export const ACCOUNT_DELETION_CONFIRMATION = "계정 삭제";

// NEXT_PUBLIC_* 는 Next가 리터럴 `process.env.NAME`을 빌드 때 치환하므로 반드시 이 모양이어야 합니다.
export function isAccountDeletionEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ACCOUNT_DELETION_ENABLED === "true";
}

export function parseAccountDeletionRequest(body: unknown): { ok: true } | { ok: false } {
  if (typeof body !== "object" || body === null) return { ok: false };
  const confirmation = (body as { confirmation?: unknown }).confirmation;
  return confirmation === ACCOUNT_DELETION_CONFIRMATION ? { ok: true } : { ok: false };
}
