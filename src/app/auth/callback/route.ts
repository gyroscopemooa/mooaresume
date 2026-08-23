import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/analysis/prepare";
}

function failure(request: NextRequest, next: string, reason: string) {
  console.error(`auth_callback_failed:${reason}`);
  const errorUrl = new URL(next, request.url);
  errorUrl.searchParams.set("auth_error", "로그인 링크를 확인하지 못했습니다. 링크를 요청한 것과 같은 브라우저에서 열어야 하며, 링크는 한 번만 사용할 수 있습니다.");
  errorUrl.searchParams.set("auth_reason", reason.slice(0, 200));
  return NextResponse.redirect(errorUrl);
}

/**
 * Completes a Supabase sign-in.
 *
 * The first version handled only the PKCE `code` form and discarded whatever
 * went wrong, so a failure in production said "로그인 링크를 확인하지
 * 못했습니다" with nothing behind it. There are four distinct ways to arrive
 * here without a session, and telling them apart is the whole job:
 *
 *  - Supabase itself refused and appended `error` / `error_description`
 *  - an email link carrying `token_hash` + `type` rather than `code`
 *  - a `code` whose PKCE verifier is missing, because the link was opened in a
 *    different browser from the one that requested it, or already used
 *  - no recognisable parameters at all
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNextPath(params.get("next"));

  const providerError = params.get("error") ?? params.get("error_code");
  if (providerError) {
    return failure(request, next, `provider:${providerError}:${params.get("error_description") ?? ""}`);
  }

  const supabase = await createClient();

  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    return failure(request, next, `exchange:${error.message}`);
  }

  // Email links are issued in this shape when the project is not using PKCE
  // for them. Handled so a working link is not rejected for arriving in the
  // other supported format.
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "email" | "magiclink" | "recovery" | "invite" | "signup",
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    return failure(request, next, `verify_otp:${error.message}`);
  }

  return failure(request, next, "missing_code_and_token_hash");
}
