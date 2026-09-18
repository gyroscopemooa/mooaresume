import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCOUNT_DELETION_CONFIRMATION, isAccountDeletionEnabled, parseAccountDeletionRequest } from "./account-deletion";

afterEach(() => vi.unstubAllEnvs());

describe("account deletion switch", () => {
  it("is off unless the env value is exactly true", () => {
    expect(isAccountDeletionEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_ACCOUNT_DELETION_ENABLED", "1");
    expect(isAccountDeletionEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_ACCOUNT_DELETION_ENABLED", "true");
    expect(isAccountDeletionEnabled()).toBe(true);
  });
});

describe("parseAccountDeletionRequest", () => {
  it("accepts only the exact confirmation phrase", () => {
    expect(parseAccountDeletionRequest({ confirmation: ACCOUNT_DELETION_CONFIRMATION })).toEqual({ ok: true });
    expect(parseAccountDeletionRequest({ confirmation: "계정삭제" })).toEqual({ ok: false });
    expect(parseAccountDeletionRequest({ confirmation: " 계정 삭제" })).toEqual({ ok: false });
    expect(parseAccountDeletionRequest({})).toEqual({ ok: false });
    expect(parseAccountDeletionRequest(null)).toEqual({ ok: false });
    expect(parseAccountDeletionRequest("계정 삭제")).toEqual({ ok: false });
  });
});
