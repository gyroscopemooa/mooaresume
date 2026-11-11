import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { emailCompletionPath, safeAuthNextPath } from "@/lib/auth/redirect";

type FailureReason = "provider_cancelled" | "identity_already_exists" | "provider_failed" | "exchange_failed" | "verify_failed" | "missing_code_and_token_hash" | "invalid_type" | "session_failed";

function failure(request: NextRequest, next: string, reason: FailureReason) {
  // Never reflect provider error descriptions, codes or user data into logs/URLs.
  console.error(`auth_callback_failed:${reason}`);
  const errorUrl = new URL(next, request.url);
  errorUrl.searchParams.set("auth_error", reason === "provider_cancelled"
    ? "로그인을 취소했습니다. 원하실 때 다시 로그인해 주세요."
    : "로그인을 완료하지 못했습니다. 로그인을 시작한 브라우저에서 다시 시도해 주세요.");
  errorUrl.searchParams.set("auth_reason", reason);
  return NextResponse.redirect(errorUrl, { status: 303, headers: { "Cache-Control": "no-store" } });
}

function completedRedirect(request: NextRequest, next: string, user: User | null) {
  if (!user) return failure(request, next, "session_failed");
  // Naver OIDC identifies users by sub, not by email. Verify a contact email
  // before returning to flows that send results/receipts. Never invent one.
  const destination = user.email && user.email_confirmed_at ? next : emailCompletionPath(next);
  return NextResponse.redirect(new URL(destination, request.url), { status: 303, headers: { "Cache-Control": "no-store" } });
}

const emailTypes = ["email", "magiclink", "recovery", "invite", "signup", "email_change"] as const;
type EmailType = typeof emailTypes[number];
function isEmailType(value: string): value is EmailType {
  return emailTypes.some((type) => type === value);
}

/** Complete the existing Supabase PKCE or email-token flow for every provider. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeAuthNextPath(params.get("next"));
  const providerError = params.get("error") ?? params.get("error_code");
  if (providerError) return failure(request, next, params.get("error_code") === "identity_already_exists" ? "identity_already_exists" : providerError === "access_denied" ? "provider_cancelled" : "provider_failed");

  try {
    const supabase = await createClient();
    const code = params.get("code");
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return failure(request, next, "exchange_failed");
      return completedRedirect(request, next, data.user);
    }
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (tokenHash && type) {
      if (!isEmailType(type)) return failure(request, next, "invalid_type");
      const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (error) return failure(request, next, "verify_failed");
      return completedRedirect(request, next, data.user);
    }
    return failure(request, next, "missing_code_and_token_hash");
  } catch {
    return failure(request, next, "session_failed");
  }
}
