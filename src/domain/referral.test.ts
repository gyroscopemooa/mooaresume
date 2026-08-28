import { describe, expect, it } from "vitest";
import {
  REFERRAL_CODE_LENGTH,
  REFERRAL_TERMS,
  createReferralCode,
  describeReferralError,
  normalizeReferralCode,
  parseReferralCode,
} from "./referral";

const bytes = (size: number) => Uint8Array.from({ length: size }, (_, index) => (index * 53) % 256);

describe("추천코드 만들기", () => {
  it("헷갈리는 글자를 쓰지 않는다", () => {
    // A code is dictated across a table and retyped on a phone. 0/O and 1/I/L
    // are where that goes wrong, and a mismatch loses a referral nobody can
    // see was lost.
    const code = createReferralCode(bytes);
    expect(code.slice(4)).not.toMatch(/[01OIL]/);
    expect(code).toMatch(/^MOOA[A-Z2-9]{6}$/);
    expect(code).toHaveLength(4 + REFERRAL_CODE_LENGTH);
  });
});

describe("사람이 실제로 치는 것을 받아준다", () => {
  it("공백·하이픈·소문자를 정리한다", () => {
    // All three arrive from someone copying a code out of a KakaoTalk message.
    expect(normalizeReferralCode(" mooa 7kq-2xz ")).toBe("MOOA7KQ2XZ");
  });

  it("정리한 뒤 형식을 본다", () => {
    expect(parseReferralCode("mooa-7kq2xz")).toEqual({ ok: true, code: "MOOA7KQ2XZ" });
  });

  it("빈 값과 잘못된 형식을 구분한다", () => {
    expect(parseReferralCode("   ")).toEqual({ ok: false, reason: "empty" });
    expect(parseReferralCode("MOOA0IL111")).toEqual({ ok: false, reason: "malformed" });
    expect(parseReferralCode("ABCD123456")).toEqual({ ok: false, reason: "malformed" });
  });
});

describe("거절 이유를 그대로 말한다", () => {
  it("본인 코드는 본인 코드라고 말한다", () => {
    // The person typing their own code is testing whether it works. Telling
    // them why is faster than letting them wonder.
    expect(describeReferralError("REFERRAL_SELF")).toContain("본인 코드");
  });

  it("이유마다 다른 문장을 준다", () => {
    const messages = ["REFERRAL_CODE_NOT_FOUND", "REFERRAL_SELF", "REFERRAL_ALREADY_USED", "REFERRAL_NOT_FIRST_PURCHASE", "something else"]
      .map(describeReferralError);
    expect(new Set(messages).size).toBe(messages.length);
  });
});

describe("약속한 조건", () => {
  it("입력만으로는 지급되지 않는다고 화면에 적는다", () => {
    // The screen and the payout have to describe the same thing. A promise the
    // webhook does not keep is worse than no referral programme.
    expect(REFERRAL_TERMS.join(" ")).toContain("코드 입력만으로는 지급되지 않습니다");
    expect(REFERRAL_TERMS.join(" ")).toContain("실제로 결제");
    expect(REFERRAL_TERMS.join(" ")).toContain("본인 코드");
    // The limit is one referral per person, not one per lifetime of never
    // having bought before. Saying "첫 결제" would promise a rule the function
    // no longer enforces.
    expect(REFERRAL_TERMS.join(" ")).toContain("이전에 결제한 적이 있어도 괜찮습니다");
    expect(REFERRAL_TERMS.join(" ")).not.toContain("첫 결제");
  });
});
