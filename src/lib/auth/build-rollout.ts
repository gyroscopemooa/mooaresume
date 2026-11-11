/** Only these non-secret UI values may be exposed through Next's env config. */
export function socialBuildEnvironment(env: Readonly<Record<string, string | undefined>>) {
  const production = env.NODE_ENV === "production";
  return {
    NEXT_PUBLIC_KAKAO_LOGIN_ENABLED: env.NEXT_PUBLIC_KAKAO_LOGIN_ENABLED ?? (production ? "true" : "false"),
    NEXT_PUBLIC_NAVER_LOGIN_ENABLED: env.NEXT_PUBLIC_NAVER_LOGIN_ENABLED ?? "false",
    NEXT_PUBLIC_NAVER_LOGIN_COMING_SOON: env.NEXT_PUBLIC_NAVER_LOGIN_COMING_SOON ?? (production ? "true" : "false"),
    NEXT_PUBLIC_NAVER_AUTH_PROVIDER: env.NEXT_PUBLIC_NAVER_AUTH_PROVIDER ?? "custom:naver",
    NEXT_PUBLIC_SOCIAL_ACCOUNT_LINKING_ENABLED: env.NEXT_PUBLIC_SOCIAL_ACCOUNT_LINKING_ENABLED ?? (production ? "true" : "false"),
  };
}
