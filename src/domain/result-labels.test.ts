import { describe, expect, it } from "vitest";
import { resolveApplicationLabel, resolveQuestionTitle, resolveResultSubject, toFilenameToken } from "./result-labels";

describe("resolveQuestionTitle", () => {
  it("쓸 수 있는 제목이 있으면 그대로 쓴다", () => {
    expect(resolveQuestionTitle({ title: "지원동기", prompt: "", order: 1 })).toBe("지원동기");
  });

  it("영문 자리표시자 제목은 문항 질문으로 대체한다", () => {
    expect(resolveQuestionTitle({ title: "Question 1", prompt: "지원 동기를 작성해 주세요.", order: 1 })).toBe("지원 동기를 작성해 주세요.");
  });

  it("제목도 질문도 없으면 한국어 문항 번호를 쓴다", () => {
    expect(resolveQuestionTitle({ title: "Question 2", prompt: "Cover-letter question", order: 2 })).toBe("문항 2");
  });

  it("아주 긴 질문은 잘라서 제목으로 쓴다", () => {
    const prompt = "가".repeat(80);
    expect(resolveQuestionTitle({ title: "", prompt, order: 1 })).toBe(`${"가".repeat(60)}…`);
  });
});

describe("resolveResultSubject", () => {
  const attachments = [{ id: "a", filename: "현대모비스_자기소개서.hwp", extension: "HWP", sizeBytes: 1, parseStatus: "ready" as const, parserLabel: "x", sectionCount: 3 }];

  it("실제 회사·직무가 있으면 그대로 보여준다", () => {
    expect(resolveResultSubject({ company: "현대모비스", role: "생산관리", attachments })).toEqual({ name: "현대모비스", qualifier: "생산관리" });
  });

  it("자리표시자면 분석한 파일 이름으로 대체한다", () => {
    expect(resolveResultSubject({ company: "Applicant company", role: "Applicant role", attachments })).toEqual({ name: "현대모비스_자기소개서", qualifier: null });
  });

  it("파일도 없으면 내 자기소개서로 부른다", () => {
    expect(resolveResultSubject({ company: "Applicant company", role: "Applicant role", attachments: [] })).toEqual({ name: "내 자기소개서", qualifier: null });
  });

  it("설명이 겹치는 일반적인 역할은 부제로 달지 않는다", () => {
    expect(resolveResultSubject({ company: "내 자기소개서", role: "자기소개서 첨삭", attachments: [] }).qualifier).toBeNull();
  });
});

describe("resolveApplicationLabel", () => {
  it("영문 자리표시자 라벨을 한국어로 바꾼다", () => {
    expect(resolveApplicationLabel({ applicationLabel: "QUICK cover-letter revision" })).toBe("자기소개서 첨삭");
    expect(resolveApplicationLabel({ applicationLabel: "생산관리 신입 지원서" })).toBe("생산관리 신입 지원서");
  });
});

describe("toFilenameToken", () => {
  it("파일 이름에 쓸 수 없는 문자를 없앤다", () => {
    expect(toFilenameToken('현대/모비스:자소서?')).toBe("현대모비스자소서");
    expect(toFilenameToken("   ")).toBe("자기소개서");
  });
});
