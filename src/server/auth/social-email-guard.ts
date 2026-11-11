import "server-only";

import { NextResponse } from "next/server";
import { emailCompletionPath } from "@/lib/auth/redirect";

type SocialEmailUser = {
  email?: string | null;
  email_confirmed_at?: string | null;
  app_metadata?: { provider?: unknown; providers?: unknown } | null;
};

/** Only trusted Auth metadata opts new social accounts into email completion. */
export function socialEmailGuard(user: SocialEmailUser, nextPath: string): NextResponse | null {
  const configuredNaver = process.env.NEXT_PUBLIC_NAVER_AUTH_PROVIDER;
  const naverProvider = configuredNaver && /^custom:[a-z0-9][a-z0-9:-]*$/.test(configuredNaver)
    ? configuredNaver : "custom:naver";
  const metadata = user.app_metadata;
  const providers = [metadata?.provider, ...(Array.isArray(metadata?.providers) ? metadata.providers : [])];
  const needsVerifiedEmail = providers.some((provider) => provider === "kakao" || provider === naverProvider);
  if (!needsVerifiedEmail || (user.email?.trim() && user.email_confirmed_at?.trim())) return null;

  return NextResponse.json({
    code: "EMAIL_CONFIRMATION_REQUIRED",
    error: "결제와 분석을 진행하려면 이메일 확인이 필요합니다. 내 계정 → 이메일 확인에서 이메일을 확인해 주세요.",
    confirmationPath: emailCompletionPath(nextPath),
  }, { status: 403 });
}
