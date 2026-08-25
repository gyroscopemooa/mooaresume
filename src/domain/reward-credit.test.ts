import { describe, expect, it } from "vitest";
import {
  CLAIM_TOKEN_BYTES,
  buildClaimUrl,
  createClaimToken,
  describeClaimFailure,
  isClaimToken,
  readClaimError,
} from "./reward-credit";

const bytes = (size: number) => Uint8Array.from({ length: size }, (_, index) => (index * 37) % 256);

describe("수령 토큰", () => {
  it("URL에 그대로 넣을 수 있는 글자만 쓴다", () => {
    // It travels in a path segment; + / = would need escaping and get mangled
    // by mail clients that rewrite links.
    const token = createClaimToken(bytes);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(isClaimToken(token)).toBe(true);
  });

  it("추측이 전략이 되지 않을 만큼 길다", () => {
    expect(CLAIM_TOKEN_BYTES).toBeGreaterThanOrEqual(32);
    expect(createClaimToken(bytes).length).toBeGreaterThanOrEqual(40);
  });

  it("아무 문자열이나 토큰으로 받지 않는다", () => {
    expect(isClaimToken("")).toBe(false);
    expect(isClaimToken("short")).toBe(false);
    expect(isClaimToken("has spaces and/slashes")).toBe(false);
    expect(isClaimToken("a".repeat(65))).toBe(false);
  });

  it("링크는 사이트 주소 뒤에 붙인다", () => {
    expect(buildClaimUrl("https://mooaresume.com/", "abc")).toBe("https://mooaresume.com/redeem/abc");
    expect(buildClaimUrl("https://mooaresume.com", "abc")).toBe("https://mooaresume.com/redeem/abc");
  });
});

describe("수령 실패 안내", () => {
  it("SQL 오류 코드를 사람이 읽을 이유로 바꾼다", () => {
    expect(readClaimError("REWARD_CREDIT_NOT_FOUND")).toBe("not_found");
    expect(readClaimError("REWARD_CREDIT_EXPIRED")).toBe("expired");
    expect(readClaimError("REWARD_CREDIT_ALREADY_CLAIMED")).toBe("taken");
    expect(readClaimError("REWARD_CREDIT_NOT_CLAIMABLE")).toBe("unavailable");
    expect(readClaimError("something else entirely")).toBe("unknown");
    expect(readClaimError(undefined)).toBe("unknown");
  });

  it("이유마다 다른 안내를 준다", () => {
    const reasons = ["not_found", "expired", "taken", "unavailable", "unknown"] as const;
    const titles = reasons.map((reason) => describeClaimFailure(reason).title);
    expect(new Set(titles).size).toBe(reasons.length);
  });

  it("다른 계정이 가져간 경우에는 그 사실을 그대로 말한다", () => {
    // The usual cause is signing in with the wrong account, and only naming it
    // lets the person fix it themselves.
    expect(describeClaimFailure("taken").detail).toContain("그 계정으로 로그인");
  });
});
