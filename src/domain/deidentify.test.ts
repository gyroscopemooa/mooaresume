import { describe, expect, it } from "vitest";
import { describeRedaction, redactPersonalData } from "./deidentify";

const redact = (text: string, knownNames?: string[]) => redactPersonalData(text, { knownNames }).text;

describe("지워야 하는 것", () => {
  it("주민등록번호", () => {
    expect(redact("990101-1234567 입니다")).toBe("[주민번호] 입니다");
    expect(redact("990101 - 1234567")).toBe("[주민번호]");
  });

  it("휴대폰과 유선 번호", () => {
    expect(redact("010-1234-5678로 연락 주세요")).toBe("[전화번호]로 연락 주세요");
    expect(redact("01012345678")).toBe("[전화번호]");
    expect(redact("052-123-4567")).toBe("[전화번호]");
  });

  it("이메일과 링크", () => {
    expect(redact("hong@naver.com")).toBe("[이메일]");
    expect(redact("포트폴리오는 https://my.site/abc 에 있습니다")).toBe("포트폴리오는 [링크] 에 있습니다");
  });

  it("건물 번호가 붙은 도로명 주소", () => {
    expect(redact("울산광역시 남구 삼산로 100, 3동 502호에 거주")).toContain("[주소]");
    // The region itself stays: where someone worked is useful and identifies nobody.
    expect(redact("울산광역시 남구 삼산로 100")).toContain("울산광역시");
  });

  it("알고 있는 이름만 지운다", () => {
    expect(redact("저는 전민수입니다.", ["전민수"])).toBe("저는 [이름]입니다.");
    // Nothing is guessed: without being told, a name is just a Korean word.
    expect(redact("저는 전민수입니다.")).toBe("저는 전민수입니다.");
  });
});

describe("남겨야 하는 것", () => {
  it("기간을 전화번호로 착각하지 않는다", () => {
    // The whole point of keeping applications is the timeline. A generic
    // digits-dash-digits rule would eat every one of these.
    for (const period of ["2023.03~2024.07", "2023-2024", "2023.03 - 2024.07", "2022 ~ 2023"]) {
      expect(redact(period)).toBe(period);
    }
  });

  it("성과 수치를 지우지 않는다", () => {
    const line = "불량률을 12% 낮추고 3개월 만에 1,200건을 처리했습니다.";
    expect(redact(line)).toBe(line);
  });

  it("회사·학교·직무는 남긴다", () => {
    const line = "울산과학대학교 기계공학과를 졸업하고 A사 품질관리로 일했습니다.";
    expect(redact(line)).toBe(line);
  });

  it("주소가 아닌 지명은 남긴다", () => {
    expect(redact("울산 지역 자동차 부품사에서 근무했습니다.")).toBe("울산 지역 자동차 부품사에서 근무했습니다.");
  });
});

describe("무엇을 지웠는지 말한다", () => {
  it("종류와 건수를 센다", () => {
    const result = redactPersonalData("010-1111-2222 / 010-3333-4444 / a@b.com");
    expect(result.removed).toEqual(expect.arrayContaining([
      { kind: "phone", count: 2 },
      { kind: "email", count: 1 },
    ]));
  });

  it("사람이 확인할 수 있는 문장으로 만든다", () => {
    // "개인정보를 제거했습니다"는 확인할 수 없습니다. 종류와 건수는 확인됩니다.
    expect(describeRedaction([{ kind: "phone", count: 2 }, { kind: "email", count: 1 }]))
      .toBe("전화번호 2건 · 이메일 1건");
    expect(describeRedaction([])).toBe("지울 개인정보를 찾지 못했습니다.");
  });

  it("이메일 안의 주소를 링크로 두 번 지우지 않는다", () => {
    const result = redactPersonalData("hong@naver.com");
    expect(result.removed).toEqual([{ kind: "email", count: 1 }]);
  });
});
