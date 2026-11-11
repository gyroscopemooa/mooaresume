import type { Provider } from "@supabase/supabase-js";

export type SocialLoginProvider = Extract<Provider, "google" | "kakao" | `custom:${string}`>;

type ProviderConfig = { kakaoEnabled?: string; naverEnabled?: string; naverProvider?: string };

/** Public switches are display settings, not credentials or authorization. */
export function getSocialLoginProviders(config: ProviderConfig = {
  kakaoEnabled: process.env.NEXT_PUBLIC_KAKAO_LOGIN_ENABLED,
  naverEnabled: process.env.NEXT_PUBLIC_NAVER_LOGIN_ENABLED,
  naverProvider: process.env.NEXT_PUBLIC_NAVER_AUTH_PROVIDER,
}): Array<{ id: SocialLoginProvider; label: string }> {
  const providers: Array<{ id: SocialLoginProvider; label: string }> = [{ id: "google", label: "Google" }];
  if (config.kakaoEnabled === "true") providers.push({ id: "kakao", label: "카카오" });
  const naver = config.naverProvider;
  if (config.naverEnabled === "true" && naver && /^custom:[a-z0-9][a-z0-9:-]*$/.test(naver) && naver.length <= 50) {
    providers.push({ id: naver as `custom:${string}`, label: "네이버" });
  }
  return providers;
}

export function getSocialLoginLabel(provider: SocialLoginProvider): string {
  return provider === "google" ? "Google" : provider === "kakao" ? "카카오" : "네이버";
}
