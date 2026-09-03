import { beforeEach, describe, expect, it } from "vitest";
import robots from "./robots";

/**
 * 크롤러에게 무엇을 열어 두는지.
 *
 * 이 파일이 조용히 틀리면 아무도 모릅니다 — 화면은 그대로고, 테스트도 대개
 * 지나갑니다. 그러다 검색 결과에 나오면 안 되는 주소가 색인됩니다.
 */

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://mooaresume.com";
});

function rulesOf() {
  const { rules } = robots();
  return Array.isArray(rules) ? rules : [rules];
}

describe("robots.txt", () => {
  it("네이버 검색로봇(Yeti)에게도 사이트를 연다", () => {
    // 네이버 웹마스터도구 가이드가 명시적인 Yeti 규칙을 권합니다.
    const yeti = rulesOf().find((rule) => rule.userAgent === "Yeti");
    expect(yeti?.allow).toBe("/");
  });

  it("모든 로봇 묶음이 같은 곳을 막는다", () => {
    // robots.txt는 **가장 구체적인 User-agent 묶음 하나만** 읽습니다. Yeti
    // 묶음에 disallow를 빠뜨리면 Yeti는 `*`의 목록을 아예 보지 않고,
    // `/redeem/`을 수집합니다 — 그 주소에는 이용권을 가져갈 수 있는 토큰이
    // 들어 있습니다.
    const lists = rulesOf().map((rule) => JSON.stringify(rule.disallow));
    expect(new Set(lists).size).toBe(1);
    for (const rule of rulesOf()) {
      expect(rule.disallow).toContain("/redeem/");
      expect(rule.disallow).toContain("/meensoo/");
    }
  });

  it("사이트맵 주소를 알려 준다", () => {
    expect(robots().sitemap).toBe("https://mooaresume.com/sitemap.xml");
  });
});
