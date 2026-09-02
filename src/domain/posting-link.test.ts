import { describe, expect, it } from "vitest";
import { findPostingUrl, removePostingUrlLine } from "./posting-link";

/**
 * 간편입력 칸에 붙여넣은 공고 링크.
 *
 * 지켜야 할 것은 하나입니다 — **혼자 서 있는 줄만** 링크로 볼 것. 자기소개서
 * 문장 속의 주소까지 집어 오면 회사 홈페이지를 언급한 문장이 공고가 됩니다.
 */

describe("findPostingUrl", () => {
  it("줄 하나가 통째로 주소면 찾는다", () => {
    const draft = ["https://www.saramin.co.kr/job/12345", "", "1. 지원동기", "저는..."].join("\n");
    expect(findPostingUrl(draft)).toBe("https://www.saramin.co.kr/job/12345");
  });

  it("www로 시작해도 찾고, 스킴을 붙여 준다", () => {
    // 사람들은 주소창에서 보이는 대로 붙여넣습니다.
    expect(findPostingUrl("www.jobkorea.co.kr/Recruit/GI_Read/123")).toBe("https://www.jobkorea.co.kr/Recruit/GI_Read/123");
  });

  it("문장 속의 주소는 건드리지 않는다", () => {
    // 이걸 집어 오면 회사 홈페이지 이야기가 공고로 둔갑합니다.
    const draft = "저는 https://company.com 에서 인턴을 했습니다. 그때 배운 것은...";
    expect(findPostingUrl(draft)).toBeNull();
  });

  it("따옴표나 괄호가 붙어 있어도 찾는다", () => {
    expect(findPostingUrl("(https://recruit.navercorp.com/1234)")).toBe("https://recruit.navercorp.com/1234");
  });

  it("주소가 없으면 없다고 답한다", () => {
    expect(findPostingUrl("1. 지원동기\n저는 이런 사람입니다.")).toBeNull();
  });

  it("첫 번째 것만 가져온다", () => {
    const draft = ["https://a.example.com/1", "https://b.example.com/2"].join("\n");
    expect(findPostingUrl(draft)).toBe("https://a.example.com/1");
  });
});

describe("removePostingUrlLine", () => {
  it("불러온 주소 줄만 빼고 나머지는 그대로 둔다", () => {
    // 남겨 두면 주소가 자기소개서 첫 문장으로 분석에 들어갑니다.
    const draft = ["https://www.saramin.co.kr/job/12345", "", "1. 지원동기", "저는..."].join("\n");
    expect(removePostingUrlLine(draft, "https://www.saramin.co.kr/job/12345"))
      .toBe(["1. 지원동기", "저는..."].join("\n"));
  });

  it("스킴을 붙여 준 주소도 원래 줄을 찾아 뺀다", () => {
    const draft = ["www.jobkorea.co.kr/1", "1. 지원동기"].join("\n");
    expect(removePostingUrlLine(draft, "https://www.jobkorea.co.kr/1")).toBe("1. 지원동기");
  });

  it("문장 속 주소는 남긴다", () => {
    const draft = "저는 https://company.com 에서 일했습니다.";
    expect(removePostingUrlLine(draft, "https://company.com")).toBe(draft);
  });
});
