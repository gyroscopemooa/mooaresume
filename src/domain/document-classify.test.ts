import { readFileSync } from "node:fs";
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
      // 자격·증명서는 이제 제 갈래가 있습니다. `기타`에 두면 참고자료 더미로
      // 들어가, 근거로 쓰라고 올린 파일이 근거로 안 쓰입니다.
      ["자격증모음.zip", "CERTIFICATE"],
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
    expect(summary.map((row) => row.label)).toEqual(["채용공고", "자기소개서", "이력서", "자격·증명서"]);
    expect(summary.find((row) => row.label === "자격·증명서")?.count).toBe(2);
    expect(summary.some((row) => row.count === 0)).toBe(false);
  });
});


describe("어긋나면 고르지 않는다", () => {
  // 실제로 터진 파일. 이름에 `채용대행`이 들어 있어 채용공고로 분류됐고,
  // 채용공고는 근거에서 빠지는 유일한 분류라 본인 경력이 통째로 사라졌습니다.
  const realFilename = "[복사] 1.직업상담,창업,컨설팅,스타트업,기획,운영,사업관리,채용대행,아웃소싱,인재매칭,알선,파견,헤드헌팅,신규사업,영업,입찰 2.자동차_QC,검사,현장,품질,생산,품질,구매,전_jeonmeensoo.pdf";
  const careerText = "경력사항 · 청년맞춤형제작소 운영 2020.02 ~ 2021.12 · 주요 성과 · 수행 업무";

  it("채용대행은 채용공고가 아니다", () => {
    expect(classifyDocument({ filename: realFilename }).kind).not.toBe("JOB_POSTING");
  });

  it("이름과 내용이 다르면 비워 둔다", () => {
    // Neither signal is trusted over the other here. The applicant knows which
    // it is, and asking costs one click; guessing cost a failed paid run.
    const result = classifyDocument({ filename: "채용공고_2026.pdf", text: careerText });
    expect(result.kind).toBe("UNSET");
    expect(result.basis).toBe("conflict");
  });

  it("한쪽만 말할 때는 그대로 따른다", () => {
    expect(classifyDocument({ filename: "채용공고_삼성전자.pdf" }).kind).toBe("JOB_POSTING");
    expect(classifyDocument({ text: "자격 요건 · 우대 사항 · 모집 분야" }).kind).toBe("JOB_POSTING");
  });

  it("둘이 같으면 비우지 않는다", () => {
    expect(classifyDocument({ filename: "이력서.pdf", text: "학 력 · 경 력 사 항 · 보유 기술" }).kind).toBe("RESUME");
  });
});

describe("고르지 못한 자료는 진행을 막는다", () => {
  const page = readFileSync("src/components/pro-input-page.tsx", "utf8");
  const intake = readFileSync("src/components/simple-intake.tsx", "utf8");

  it("UNSET이 남아 있으면 시작 버튼이 막힌다", () => {
    // An unclassified file belongs to no bucket, so submitting one drops it
    // from the analysis silently — quieter than a wrong guess and worse.
    expect(page).toContain('file.kind === "UNSET"');
    expect(page).toContain("unsetFileCount > 0");
  });

  it("어느 줄인지 눈에 보인다", () => {
    expect(intake).toContain('data-unset={file.kind === "UNSET"');
    expect(intake).toContain("styles.unsetWarning");
  });

  it("왜 중요한지는 말풍선에 둔다", () => {
    // A paragraph under the list is a paragraph nobody reads.
    expect(intake).toContain('role="tooltip"');
    expect(intake).toContain("첨삭에 인용하지 않습니다");
  });
});

describe("자격·증명서", () => {
  it("학교 서류도 갈래를 찾는다", () => {
    // 생활기록부·성적표는 이름에 "증명서"가 없어 어느 규칙에도 걸리지
    // 않았고, 그래서 분류를 고르지 못한 자료로 남았습니다. 대기업 생산직처럼
    // 실제로 제출을 요구하는 전형이 있어 받을 이유가 분명합니다.
    for (const filename of ["고등학교 생활기록부.pdf", "성적표.pdf", "성적증명서.pdf"]) {
      expect(classifyDocument({ filename, text: "" }).kind).toBe("CERTIFICATE");
    }
  });

  it("자격증 이름들을 알아본다", () => {
    for (const filename of ["직업상담사2급.pdf", "지게차운전기능사.pdf", "운전면허증.pdf", "산업기사.pdf"]) {
      expect(classifyDocument({ filename, text: "" }).kind).toBe("CERTIFICATE");
    }
  });

  it("경력증명서는 경력기술서 쪽으로 남는다", () => {
    // 규칙 순서가 지켜야 하는 것: `경력증명`이 `증명서`보다 먼저입니다.
    // 경력증명서는 실제로 경력을 적은 문서이고, 근거 자료로 읽혀야 합니다.
    expect(classifyDocument({ filename: "경력증명서.pdf", text: "" }).kind).toBe("CAREER_DOCUMENT");
  });
});

describe("넓은 규칙이 자기소개서를 삼키지 않는다", () => {
  it("직업 이름이 들어간 자소서 파일명을 자격증으로 보내지 않는다", () => {
    // `상담사`를 자격증 규칙에 넣었더니 이 파일이 자격·증명서로 갔습니다.
    // 파일 이름에 "자기소개서"가 없으면 앞 규칙이 걸러 주지 못하므로, 마지막
    // 규칙이 넓으면 그대로 사고가 됩니다.
    expect(classifyDocument({ filename: "대학일자리센터_직업상담사_커리어컨설턴트_전민수.pdf", text: "" }).kind)
      .not.toBe("CERTIFICATE");
  });

  it("급수가 붙은 진짜 자격증은 그대로 알아본다", () => {
    expect(classifyDocument({ filename: "직업상담사2급.pdf", text: "" }).kind).toBe("CERTIFICATE");
  });
});
