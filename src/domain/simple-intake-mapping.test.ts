import { describe, expect, it } from "vitest";
import { describeSimpleIntakeGap, mapSimpleIntake, type SimpleIntakeSource } from "./simple-intake-mapping";

function file(filename: string, kind: SimpleIntakeSource["kind"], text = "내용"): SimpleIntakeSource {
  return { filename, extension: filename.split(".").pop() ?? "pdf", sizeBytes: 1024, text, kind };
}

describe("간편 입력 매핑", () => {
  it("종류별로 기존 저장 형태에 나눠 담는다", () => {
    const mapped = mapSimpleIntake("", [
      file("공고.pdf", "JOB_POSTING", "자격 요건"),
      file("자소서.docx", "COVER_LETTER", "1. 지원 동기\n답변입니다."),
      file("이력서.pdf", "RESUME"),
      file("경력기술서.pdf", "CAREER_DOCUMENT"),
      file("포트폴리오.pdf", "PORTFOLIO"),
      file("자격증.pdf", "OTHER"),
    ]);
    expect(mapped.posting).toBe("자격 요건");
    expect(mapped.postingFilenames).toEqual(["공고.pdf"]);
    expect(mapped.materialAttachments.map((item) => item.kind)).toEqual(["RESUME", "CAREER_DOCUMENT", "PORTFOLIO"]);
    expect(mapped.freeformAttachments.map((item) => item.filename)).toEqual(["자격증.pdf"]);
    expect(mapped.questions.some((question) => question.answer.includes("답변입니다"))).toBe(true);
  });

  it("붙여넣은 글이 첨부된 자소서 파일보다 우선한다", () => {
    // Someone who pasted the letter and also attached an older copy means the
    // pasted one. Taking the file would silently analyse the wrong draft.
    const mapped = mapSimpleIntake("새로 쓴 내용입니다.", [file("예전자소서.docx", "COVER_LETTER", "옛날 내용")]);
    expect(mapped.questions[0].answer).toContain("새로 쓴 내용");
    expect(mapped.questions[0].answer).not.toContain("옛날 내용");
    // No source file either: the letter did not come from one.
    expect(mapped.sourceFile).toBeNull();
  });

  it("파일에서 온 자소서는 원본 파일명을 남긴다", () => {
    const mapped = mapSimpleIntake("", [file("자소서.docx", "COVER_LETTER", "내용입니다")]);
    expect(mapped.sourceFile?.filename).toBe("자소서.docx");
  });

  it("첨부 개수 상한을 넘으면 조용히 버리지 않고 이름을 남긴다", () => {
    // The saved draft caps each list at 10 and throws on save, after the screen
    // is already full. Trimming here means it can be said out loud instead.
    const many = Array.from({ length: 13 }, (_, index) => file(`증빙${index}.pdf`, "OTHER"));
    const mapped = mapSimpleIntake("자소서 내용", many);
    expect(mapped.freeformAttachments).toHaveLength(10);
    expect(mapped.droppedFilenames).toEqual(["증빙10.pdf", "증빙11.pdf", "증빙12.pdf"]);
  });

  it("아주 긴 파일은 잘라서 담는다", () => {
    const mapped = mapSimpleIntake("자소서", [file("긴자료.pdf", "OTHER", "가".repeat(60_000))]);
    expect(mapped.freeformAttachments[0].text).toHaveLength(50_000);
  });

  it("빈 입력에도 문항 하나는 남는다", () => {
    const mapped = mapSimpleIntake("", []);
    expect(mapped.questions).toHaveLength(1);
    expect(mapped.questions[0].answer).toBe("");
  });

  it("모자란 것을 이름 대고 말한다", () => {
    // One box, so "필수 항목을 확인하세요" leaves them nothing to act on.
    expect(describeSimpleIntakeGap(mapSimpleIntake("", []))).toContain("자기소개서");
    expect(describeSimpleIntakeGap(mapSimpleIntake("자소서 내용입니다", []))).toContain("채용공고");
    expect(describeSimpleIntakeGap(mapSimpleIntake("자소서 내용입니다", [file("공고.pdf", "JOB_POSTING", "자격 요건")]))).toBe("");
  });
});

describe("간편 입력 글자 수", () => {
  it("한 번 적은 글자 수를 모든 문항에 채운다", () => {
    const mapped = mapSimpleIntake("1. 지원 동기\n답변\n\n2. 직무 역량\n답변", [], 600);
    expect(mapped.questions.every((question) => question.targetLength === 600)).toBe(true);
  });

  it("문항이 스스로 밝힌 글자 수를 덮어쓰지 않는다", () => {
    // The applicant typed one number for the whole form; the employer printed
    // the real one next to the question.
    const mapped = mapSimpleIntake("1. 지원 동기 (800자)\n답변\n\n2. 직무 역량\n답변", [], 600);
    expect(mapped.questions[0].targetLength).toBe(800);
    expect(mapped.questions[1].targetLength).toBe(600);
  });

  it("비워두면 아무것도 채우지 않는다", () => {
    const mapped = mapSimpleIntake("1. 지원 동기\n답변", [], null);
    expect(mapped.questions[0].targetLength).toBeNull();
  });
});
