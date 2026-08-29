import { describe, expect, it } from "vitest";
import { classifyAll, classifyDocument, summarizeClassification } from "./document-classify";

describe("자료 자동 분류", () => {
  it("파일명으로 흔한 이름들을 가른다", () => {
    const cases: Array<[string, string]> = [
      ["현대차공고.pdf", "JOB_POSTING"],
      ["2026 상반기 채용공고.pdf", "JOB_POSTING"],
      ["자기소개서.docx", "COVER_LETTER"],
      ["자소서_최종.hwp", "COVER_LETTER"],
      ["이력서.pdf", "RESUME"],
      ["입사지원서_홍길동.pdf", "RESUME"],
      ["경력기술서.pdf", "CAREER_DOCUMENT"],
      ["포트폴리오_2026.pdf", "PORTFOLIO"],
      ["자격증모음.zip", "OTHER"],
    ];
    for (const [filename, expected] of cases) {
      expect(classifyDocument({ filename }).kind, filename).toBe(expected);
    }
  });

  it("경력기술서가 이력서로 새지 않는다", () => {
    // 경력기술서 contains 경력, and a looser RESUME pattern placed earlier would
    // swallow it. Order in the hint list is the guard.
    expect(classifyDocument({ filename: "경력기술서.pdf" }).kind).toBe("CAREER_DOCUMENT");
    expect(classifyDocument({ filename: "자기소개서_및_이력서.pdf" }).kind).toBe("COVER_LETTER");
  });

  it("이름이 쓸모없으면 내용 첫머리를 본다", () => {
    const posting = classifyDocument({ filename: "문서1.pdf", text: "담당 업무\n자격 요건\n우대 사항" });
    expect(posting.basis).toBe("content");
    expect(posting.kind).toBe("JOB_POSTING");
    expect(classifyDocument({ filename: "scan0001.pdf", text: "지원 동기\n성장 과정\n입사 후 포부" }).kind).toBe("COVER_LETTER");
    expect(classifyDocument({ filename: "무제.pdf", text: "학력\n경력 사항\n보유 기술" }).kind).toBe("RESUME");
  });

  it("붙여넣은 글은 자기소개서로 본다", () => {
    // The box asks for the letter first, and pasted text has no filename to go
    // on. Guessing 기타 자료 here would drop the one document that matters.
    const pasted = classifyDocument({ text: "저는 데이터 분석 직무에 지원합니다." });
    expect(pasted.kind).toBe("COVER_LETTER");
    expect(pasted.basis).toBe("fallback");
  });

  it("아무 단서도 없으면 기타로 둔다", () => {
    expect(classifyDocument({}).kind).toBe("OTHER");
    expect(classifyDocument({ filename: "a.bin", text: "   " }).kind).toBe("OTHER");
  });

  it("여러 번 불러도 같은 답을 낸다", () => {
    // Content patterns carry the g flag, so a shared lastIndex would make the
    // second call disagree with the first.
    const input = { filename: "문서1.pdf", text: "담당 업무\n자격 요건\n우대 사항" };
    expect(classifyDocument(input).kind).toBe(classifyDocument(input).kind);
    expect(classifyDocument({ filename: "이력서.pdf" }).kind).toBe(classifyDocument({ filename: "이력서.pdf" }).kind);
  });

  it("확인 화면용 요약은 빈 종류를 빼고 읽는 순서대로 낸다", () => {
    const items = classifyAll([
      { id: "1", filename: "현대차공고.pdf" },
      { id: "2", filename: "자기소개서.docx" },
      { id: "3", filename: "이력서.pdf" },
      { id: "4", filename: "자격증.zip" },
      { id: "5", filename: "수료증.pdf" },
    ]);
    const summary = summarizeClassification(items);
    expect(summary.map((row) => row.label)).toEqual(["채용공고", "자기소개서", "이력서", "기타 자료"]);
    expect(summary.find((row) => row.label === "기타 자료")?.count).toBe(2);
    expect(summary.some((row) => row.count === 0)).toBe(false);
  });
});
