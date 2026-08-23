import { describe, expect, it } from "vitest";
import { MAX_RECIPIENTS, parseRecipientList } from "./recipient-list";

describe("받는 사람 여러 명 입력", () => {
  it("콤마로 나누고 공백을 정리한다", () => {
    const result = parseRecipientList("a@school.ac.kr, b@school.ac.kr ,c@school.ac.kr");

    expect(result).toEqual({ ok: true, recipients: ["a@school.ac.kr", "b@school.ac.kr", "c@school.ac.kr"] });
  });

  it("줄바꿈과 세미콜론으로 붙여넣어도 나눈다", () => {
    // 엑셀이나 메일 클라이언트에서 복사하면 콤마로 오지 않는다.
    const result = parseRecipientList("a@school.ac.kr;b@school.ac.kr\nc@school.ac.kr");

    expect(result.ok && result.recipients).toHaveLength(3);
  });

  it("같은 주소를 두 번 적으면 한 번만 보낸다", () => {
    const result = parseRecipientList("a@school.ac.kr, A@School.ac.kr");

    expect(result).toEqual({ ok: true, recipients: ["a@school.ac.kr"] });
  });

  it("하나라도 형식이 틀리면 전체를 막고 어느 것인지 알려준다", () => {
    // 부분 발송은 되돌릴 수 없다. 보내기 전에 멈추는 편이 낫다.
    const result = parseRecipientList("a@school.ac.kr, 이건주소가아님, c@school.ac.kr");

    expect(result).toEqual({ ok: false, reason: "invalid", invalid: ["이건주소가아님"] });
  });

  it("비어 있으면 거절한다", () => {
    expect(parseRecipientList("  , ,  ")).toEqual({ ok: false, reason: "empty" });
  });

  it("상한을 넘으면 거절한다", () => {
    const many = Array.from({ length: MAX_RECIPIENTS + 1 }, (_, index) => `user${index}@school.ac.kr`).join(",");

    expect(parseRecipientList(many)).toEqual({ ok: false, reason: "too_many" });
  });

  it("상한까지는 허용한다", () => {
    const exact = Array.from({ length: MAX_RECIPIENTS }, (_, index) => `user${index}@school.ac.kr`).join(",");

    expect(parseRecipientList(exact).ok).toBe(true);
  });
});
