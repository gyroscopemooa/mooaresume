import { afterEach, describe, expect, it, vi } from "vitest";
import { getLinkedSocialLoginLabels } from "./social-providers";
import { getAuthCallbackMessage, isIdentityConflict } from "./callback-message";

afterEach(() => vi.unstubAllEnvs());

describe("account identity guidance", () => {
  it("labels linked social identities independent of rollout and email identity", () => {
    expect(getLinkedSocialLoginLabels(["email", "custom:naver"], { naverEnabled: "false" })).toEqual(["네이버"]);
    expect(getLinkedSocialLoginLabels(["google", "kakao", "google"], {})).toEqual(["Google", "카카오"]);
  });
  it("does not invent labels for unknown providers", () => {
    expect(getLinkedSocialLoginLabels(["email", "custom:unknown", "arbitrary-provider"], {})).toEqual([]);
    expect(getLinkedSocialLoginLabels(["custom:naver-alt"], { naverProvider: "custom:naver-alt" })).toEqual(["네이버"]);
  });
  it("classifies only documented structured identity conflicts", () => {
    expect(isIdentityConflict({ code: "identity_already_exists", message: "private" })).toBe(true);
    for (const input of [null, undefined, "identity_already_exists", new Error("identity_already_exists"), { message: "identity_already_exists" }, { code: "unknown" }]) expect(isIdentityConflict(input)).toBe(false);
    expect(getAuthCallbackMessage("identity_already_exists")).toContain("이메일을 바꿔도 계정과 구매 내역은 합쳐지지 않습니다");
  });
});
