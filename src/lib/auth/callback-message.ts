/** Never display provider-controlled error descriptions or raw error values. */
export function getAuthCallbackMessage(reason: string | null): string | null {
  if (reason === "provider_cancelled") return "로그인을 취소했습니다. 원하실 때 다시 시도해 주세요.";
  if (reason === "identity_already_exists") return "이 소셜 계정은 다른 계정에 연결되어 있습니다. 이전 로그인 방법으로 이용해 주세요. 계정은 자동으로 합쳐지지 않습니다.";
  if (["provider_failed", "exchange_failed", "verify_failed", "missing_code_and_token_hash", "invalid_type", "session_failed"].includes(reason ?? "")) return "로그인 또는 계정 연결을 완료하지 못했습니다. 같은 브라우저에서 다시 시도해 주세요.";
  return null;
}
