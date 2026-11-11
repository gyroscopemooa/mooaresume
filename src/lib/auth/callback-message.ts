/** Never display provider-controlled error descriptions or raw error values. */
export function getAuthCallbackMessage(reason: string | null): string | null {
  if (reason === "provider_cancelled") return "로그인을 취소했습니다. 원하실 때 다시 시도해 주세요.";
  if (reason === "identity_already_exists") return "이 소셜 계정은 이미 다른 계정에 연결되어 있어 현재 계정에 연결할 수 없습니다. 기존 계정의 로그인 방법으로 이용해 주세요. 이메일을 바꿔도 계정과 구매 내역은 합쳐지지 않습니다.";
  if (["provider_failed", "exchange_failed", "verify_failed", "missing_code_and_token_hash", "invalid_type", "session_failed"].includes(reason ?? "")) return "로그인 또는 계정 연결을 완료하지 못했습니다. 같은 브라우저에서 다시 시도해 주세요.";
  return null;
}

/** Classify only the documented code, not arbitrary provider-controlled text. */
export function isIdentityConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "identity_already_exists";
}
