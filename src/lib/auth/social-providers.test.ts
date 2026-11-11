import { describe, expect, it } from "vitest";
import { getSocialLoginProviders } from "./social-providers";
import { emailCompletionPath, safeAuthNextPath } from "./redirect";

describe("social provider rollout", () => {
  it("keeps only Google until providers are explicitly configured", () => {
    expect(getSocialLoginProviders({})).toEqual([{ id: "google", label: "Google" }]);
    expect(getSocialLoginProviders({ kakaoEnabled: "1", naverEnabled: "true" })).toHaveLength(1);
  });
  it("uses native Kakao and a configured custom Naver provider", () => {
    expect(getSocialLoginProviders({ kakaoEnabled: "true", naverEnabled: "true", naverProvider: "custom:naver" }).map(({ id }) => id)).toEqual(["google", "kakao", "custom:naver"]);
  });
  it.each(["naver", "google", "custom:", "custom:bad provider", "https://evil.test", `custom:${"a".repeat(50)}`])("rejects invalid custom identifier %s", (naverProvider) => {
    expect(getSocialLoginProviders({ naverEnabled: "true", naverProvider })).toHaveLength(1);
  });
});

describe("auth return destinations", () => {
  it("preserves result identifiers, query values and fragments", () => {
    expect(safeAuthNextPath("/result?analysisRunId=123&source=twa#review")).toBe("/result?analysisRunId=123&source=twa#review");
  });
  it.each([null, "https://evil.test", "//evil.test", "/\\evil.test", "/\t/evil.test", "/\n/evil.test", "/auth/callback?next=/", "/app/../auth/callback"]) ("rejects unsafe or looping destination %s", (value) => {
    expect(safeAuthNextPath(value)).toBe("/analysis/prepare");
  });
  it("encodes email completion return path as one parameter", () => {
    const url = new URL(emailCompletionPath("/result?analysisRunId=x&source=twa"), "https://mooaresume.com");
    expect(url.searchParams.get("next")).toBe("/result?analysisRunId=x&source=twa");
    expect(url.searchParams.size).toBe(1);
  });
});
