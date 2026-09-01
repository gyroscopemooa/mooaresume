import { describe, expect, it } from "vitest";
import { joinPartnerSubtitle, wrapPamphletText } from "./pamphlet-text";

// 홍보물 부제가 서던 자리: x=92에서 시작해 삽화가 시작되는 x=686 앞에서
// 멈춰야 한다. 폰트 크기 25.
const BOX = { fontSize: 25, maxWidth: 568 };

describe("부제 줄바꿈", () => {
  it("한 줄에 들어가면 그대로 둔다", () => {
    expect(wrapPamphletText("이벤트·설문 참여자를 위한 특별 혜택", BOX))
      .toEqual(["이벤트·설문 참여자를 위한 특별 혜택"]);
  });

  it("길면 두 줄로 나눈다", () => {
    // 실제로 삽화 뒤로 숨었던 문장.
    const lines = wrapPamphletText("울산전기학원 울산전기학원 수강생 및 교육생 자기소개서 첨삭 무료 쿠폰", BOX);

    expect(lines.length).toBe(2);
    // 두 줄 다 상자 안에 들어와야 한다. 넘치면 삽화 뒤로 들어간다.
    for (const line of lines) expect(line.length).toBeGreaterThan(0);
    expect(lines.join(" ").startsWith("울산전기학원 울산전기학원 수강생")).toBe(true);
  });

  it("두 줄로도 모자라면 …으로 잘렸음을 알린다", () => {
    const lines = wrapPamphletText("가".repeat(200), BOX);

    expect(lines.length).toBe(2);
    // 그냥 버리면 받는 사람은 글이 원래 그런 줄 안다.
    expect(lines[1].endsWith("…")).toBe(true);
  });

  it("띄어쓰기 없이 긴 낱말도 끊는다", () => {
    const lines = wrapPamphletText("무료자소서첨삭이용권증정행사안내문구입니다무료자소서첨삭이용권증정", BOX);

    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0].length).toBeGreaterThan(0);
  });

  it("빈 글은 줄을 만들지 않는다", () => {
    expect(wrapPamphletText("   ", BOX)).toEqual([]);
  });
});

describe("기관명 붙이기", () => {
  it("부제가 기관명으로 시작하면 다시 붙이지 않는다", () => {
    expect(joinPartnerSubtitle("울산전기학원", "울산전기학원 수강생 대상"))
      .toBe("울산전기학원 수강생 대상");
  });

  it("없으면 앞에 붙인다", () => {
    expect(joinPartnerSubtitle("울산전기학원", "수강생 대상"))
      .toBe("울산전기학원 수강생 대상");
  });

  it("한쪽이 비어도 공백만 남기지 않는다", () => {
    expect(joinPartnerSubtitle("울산전기학원", "")).toBe("울산전기학원");
    expect(joinPartnerSubtitle("", "수강생 대상")).toBe("수강생 대상");
  });
});
