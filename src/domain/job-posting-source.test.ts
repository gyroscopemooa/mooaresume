import { describe, expect, it } from "vitest";
import { findJobPostingUrl, isLinkOnlyPosting, parseJobPostingInput } from "./job-posting-source";

const saramin = "https://www.saramin.co.kr/zf_user/jobs/relay/view?view_type=search&rec_idx=54715018&location=ts&searchword=%EC%95%88%EC%A0%84&paid_fl=n&t_ref=search";

describe("parseJobPostingInput", () => {
  it("링크만 넣으면 링크로만 인식한다", () => {
    expect(parseJobPostingInput(saramin)).toEqual({ url: saramin, text: "" });
  });

  it("링크 뒤에 공백 없이 이어 쓴 직무명을 링크가 삼키지 않는다", () => {
    const typed = `${saramin}안전관리자`;
    const parsed = parseJobPostingInput(typed);

    expect(parsed.url).toBe(saramin);
    expect(parsed.text).toBe(typed);
  });

  it("링크와 본문을 함께 넣으면 본문을 유지한다", () => {
    const typed = `${saramin}\n안전관리자 · 산업안전기사 우대`;
    const parsed = parseJobPostingInput(typed);

    expect(parsed.url).toBe(saramin);
    expect(parsed.text).toContain("산업안전기사 우대");
  });

  it("퍼센트 인코딩과 쿼리 문자열을 끝까지 링크로 읽는다", () => {
    expect(findJobPostingUrl(`공고입니다 ${saramin} 확인 부탁드립니다`)).toBe(saramin);
  });

  it("링크가 없으면 전부 본문이다", () => {
    expect(parseJobPostingInput("안전관리자 채용")).toEqual({ url: "", text: "안전관리자 채용" });
  });
});

describe("isLinkOnlyPosting", () => {
  it("링크뿐이면 분석할 공고 내용이 없다고 본다", () => {
    expect(isLinkOnlyPosting({ url: saramin, text: "", filenames: [] })).toBe(true);
  });

  it("본문이나 첨부가 있으면 분석할 내용이 있다", () => {
    expect(isLinkOnlyPosting({ url: saramin, text: "안전관리자 모집", filenames: [] })).toBe(false);
    expect(isLinkOnlyPosting({ url: saramin, text: "", filenames: ["공고.pdf"] })).toBe(false);
  });
});
