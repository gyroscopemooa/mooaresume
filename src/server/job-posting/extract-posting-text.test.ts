import { describe, expect, it } from "vitest";
import {
  deriveCandidateUrls,
  evaluateExtraction,
  htmlToText,
  isFetchableUrl,
} from "./extract-posting-text";

const saraminUrl = "https://www.saramin.co.kr/zf_user/jobs/relay/view?view_type=search&rec_idx=54715018&t_ref=search";

describe("deriveCandidateUrls", () => {
  it("사람인 링크는 모집요강만 따로 주는 주소를 먼저 시도한다", () => {
    const [first, ...rest] = deriveCandidateUrls(saraminUrl);

    expect(first).toBe("https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=54715018");
    expect(rest).toContain(saraminUrl);
  });

  it("사람인이 아니면 받은 주소만 시도한다", () => {
    expect(deriveCandidateUrls("https://careers.example.com/jobs/7")).toEqual(["https://careers.example.com/jobs/7"]);
  });

  it("주소가 아니거나 http가 아니면 시도하지 않는다", () => {
    expect(deriveCandidateUrls("javascript:alert(1)")).toEqual([]);
    expect(deriveCandidateUrls("그냥 글자")).toEqual([]);
  });
});

describe("isFetchableUrl", () => {
  it("내부 주소로는 요청하지 않는다", () => {
    for (const blocked of ["http://localhost:3000/x", "http://127.0.0.1/x", "http://10.0.0.5/x", "http://192.168.0.1/x", "http://169.254.169.254/latest/meta-data", "file:///etc/passwd"]) {
      expect(isFetchableUrl(blocked)).toBe(false);
    }
  });

  it("공개된 채용 사이트는 허용한다", () => {
    expect(isFetchableUrl(saraminUrl)).toBe(true);
  });
});

describe("htmlToText", () => {
  it("스크립트와 스타일은 본문에서 뺀다", () => {
    const text = htmlToText("<div>자격요건<script>var a=1;</script><style>.a{}</style>경력 3년</div>");

    expect(text).toContain("자격요건");
    expect(text).not.toContain("var a=1");
    expect(text).not.toContain(".a{}");
  });

  it("문단 태그는 줄바꿈으로 바꾸고 엔티티는 되돌린다", () => {
    expect(htmlToText("<p>가</p><p>나&amp;다</p>")).toBe("가\n나&다");
  });
});

describe("evaluateExtraction", () => {
  const posting = `모집 요강
자격요건: 건설사 현장업무 3년 이상 경력자
필수사항: 법적 안전관리자 선임 가능자
주요업무: 본사 안전보건체계 구축
우대사항: 산업위생 자격증 소지자
근무조건: 정규직
전형절차: 서류 후 면접
학력: 대졸 이상, 경력 3년 이상 담당업무 안전관리
모집분야: 안전관리자 현장 채용, 안전팀원 본사 채용
접수기간: 2026.08.12 ~ 2026.08.31, 접수방법은 사람인 입사지원
제출서류: 이력서, 자기소개서를 준비해 제출해 주세요
근무지역: 서울 관악구 본사 및 경기 용인시 현장, 전국 순환 근무 가능자 우대`;

  it("공고다운 내용이면 통과시킨다", () => {
    const result = evaluateExtraction(posting, "https://example.com");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toContain("법적 안전관리자");
  });

  it("메뉴만 긁힌 결과는 읽지 못한 것으로 처리한다", () => {
    expect(evaluateExtraction("로그인 회원가입 고객센터 이벤트 공지사항", "https://example.com")).toEqual({ ok: false, reason: "UNREADABLE" });
  });
});
