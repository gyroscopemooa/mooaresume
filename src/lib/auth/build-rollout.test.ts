import { describe, expect, it } from "vitest";
import { socialBuildEnvironment } from "./build-rollout";

describe("approved production social rollout", () => {
  it("persists Kakao and linking while Naver remains a non-OAuth placeholder", () => {
    expect(socialBuildEnvironment({ NODE_ENV: "production" })).toEqual({
      NEXT_PUBLIC_KAKAO_LOGIN_ENABLED: "true",
      NEXT_PUBLIC_NAVER_LOGIN_ENABLED: "false",
      NEXT_PUBLIC_NAVER_LOGIN_COMING_SOON: "true",
      NEXT_PUBLIC_NAVER_AUTH_PROVIDER: "custom:naver",
      NEXT_PUBLIC_SOCIAL_ACCOUNT_LINKING_ENABLED: "true",
    });
  });
  it("keeps development defaults gated and permits explicit local Naver tests", () => {
    expect(socialBuildEnvironment({ NODE_ENV: "development" }).NEXT_PUBLIC_KAKAO_LOGIN_ENABLED).toBe("false");
    expect(socialBuildEnvironment({ NODE_ENV: "development", NEXT_PUBLIC_NAVER_LOGIN_ENABLED: "true" }).NEXT_PUBLIC_NAVER_LOGIN_ENABLED).toBe("true");
  });
  it("honors explicit rollback settings", () => {
    const env = socialBuildEnvironment({ NODE_ENV: "production", NEXT_PUBLIC_KAKAO_LOGIN_ENABLED: "false", NEXT_PUBLIC_SOCIAL_ACCOUNT_LINKING_ENABLED: "false", NEXT_PUBLIC_NAVER_LOGIN_COMING_SOON: "false" });
    expect(env.NEXT_PUBLIC_KAKAO_LOGIN_ENABLED).toBe("false");
    expect(env.NEXT_PUBLIC_SOCIAL_ACCOUNT_LINKING_ENABLED).toBe("false");
    expect(env.NEXT_PUBLIC_NAVER_LOGIN_COMING_SOON).toBe("false");
  });
  it("exposes only the five UI values and never copies arbitrary environment secrets", () => {
    const env = socialBuildEnvironment({ NODE_ENV: "production", SUPABASE_SERVICE_ROLE_KEY: "private-example", OPENAI_API_KEY: "private-example", UNRELATED: "private-example" });
    expect(Object.keys(env)).toHaveLength(5);
    expect(Object.keys(env).every((key) => key.startsWith("NEXT_PUBLIC_"))).toBe(true);
    expect(JSON.stringify(env)).not.toContain("private-example");
  });
});
