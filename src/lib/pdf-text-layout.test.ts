import { describe, expect, it } from "vitest";
import { joinPdfTextItems, type PdfTextItem } from "./pdf-text-layout";

/** One glyph run at (x, y), 10pt tall unless told otherwise. */
function run(str: string, x: number, y: number, width = str.length * 10, extra: Partial<PdfTextItem> = {}): PdfTextItem {
  return { str, transform: [10, 0, 0, 10, x, y], width, ...extra };
}

describe("joinPdfTextItems", () => {
  it("붙어 있는 조각을 공백 없이 잇는다", () => {
    // The old join(" ") turned one word into "지원 동기" and cut punctuation off.
    expect(joinPdfTextItems([run("지원", 0, 100, 20), run("동기", 20, 100, 20), run(",", 40, 100, 5)]))
      .toBe("지원동기,");
  });

  it("떨어져 있으면 공백을 넣는다", () => {
    expect(joinPdfTextItems([run("AI", 0, 100, 20), run("창업", 26, 100, 20)])).toBe("AI 창업");
  });

  it("이미 공백이 있으면 두 번 넣지 않는다", () => {
    expect(joinPdfTextItems([run("AI ", 0, 100, 22), run("창업", 26, 100, 20)])).toBe("AI 창업");
    expect(joinPdfTextItems([run("AI", 0, 100, 20), run(" 창업", 26, 100, 22)])).toBe("AI 창업");
  });

  it("hasEOL에서 줄을 바꾼다", () => {
    const text = joinPdfTextItems([
      run("1. 지원동기", 0, 200, 60, { hasEOL: true }),
      run("첫 번째 답변", 0, 180, 60, { hasEOL: true }),
    ]);
    expect(text).toBe("1. 지원동기\n첫 번째 답변");
  });

  it("hasEOL이 없어도 y가 내려가면 줄을 바꾼다", () => {
    // Plenty of generators never set hasEOL. Without this the whole page comes
    // back as one line and question splitting finds nothing.
    const text = joinPdfTextItems([
      run("1. 지원동기", 0, 200, 60),
      run("첫 번째 답변", 0, 180, 60),
      run("2. 직무 강점", 0, 160, 60),
    ]);
    expect(text.split("\n")).toEqual(["1. 지원동기", "첫 번째 답변", "2. 직무 강점"]);
  });

  it("같은 줄 안에서는 x가 뒤로 가도 줄을 바꾸지 않는다", () => {
    const text = joinPdfTextItems([run("가", 100, 200, 10), run("나", 10, 200, 10)]);
    expect(text).not.toContain("\n");
  });

  it("문항 번호가 줄 맨 앞에 오게 만든다", () => {
    // This is the property splitCoverLetterDraft depends on. It scans for a
    // number at the start of a line; mid-line it matches nothing.
    const text = joinPdfTextItems([
      run("1.", 0, 300, 12), run("지원동기", 16, 300, 40, { hasEOL: true }),
      run("내용입니다.", 0, 280, 60, { hasEOL: true }),
      run("2.", 0, 260, 12), run("직무", 16, 260, 20, { hasEOL: true }),
    ]);
    const starts = text.split("\n").filter((line) => /^\d\./.test(line));
    expect(starts).toEqual(["1. 지원동기", "2. 직무"]);
  });

  it("빈 조각은 줄바꿈 신호로만 쓴다", () => {
    const text = joinPdfTextItems([
      run("첫 줄", 0, 200, 30),
      { str: "", hasEOL: true },
      run("둘째 줄", 0, 180, 30),
    ]);
    expect(text).toBe("첫 줄\n둘째 줄");
  });

  it("빈 줄이 이어져도 문단 사이는 한 줄만 남긴다", () => {
    const text = joinPdfTextItems([
      run("문단 1", 0, 300, 30, { hasEOL: true }),
      { str: "", hasEOL: true },
      { str: "", hasEOL: true },
      { str: "", hasEOL: true },
      run("문단 2", 0, 200, 30, { hasEOL: true }),
    ]);
    expect(text).toBe("문단 1\n\n문단 2");
  });

  it("글자 크기가 달라도 같은 기준으로 판단한다", () => {
    // Ratios, not fixed point values: a 24pt heading has wider everything.
    const big = (str: string, x: number, y: number, width: number, extra: Partial<PdfTextItem> = {}): PdfTextItem =>
      ({ str, transform: [24, 0, 0, 24, x, y], width, ...extra });
    expect(joinPdfTextItems([big("제목", 0, 500, 48), big("입니다", 50, 500, 72)])).toBe("제목입니다");
    expect(joinPdfTextItems([big("제목", 0, 500, 48), big("입니다", 60, 500, 72)])).toBe("제목 입니다");
  });

  it("아무것도 없으면 빈 문자열", () => {
    expect(joinPdfTextItems([])).toBe("");
    expect(joinPdfTextItems([{ str: "" }])).toBe("");
  });
});
