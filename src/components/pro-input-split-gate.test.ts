import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { splitCoverLetterDraft } from "@/domain/cover-letter-parser";

const page = readFileSync("src/components/pro-input-page.tsx", "utf8");
const intake = readFileSync("src/components/resume-intake.tsx", "utf8");

describe("문항 구분 게이트", () => {
  it("한 문항짜리 자소서가 막다른 길이 아니다", () => {
    // splitCoverLetterDraft returns one question for a single-question letter,
    // so the old gate told the applicant to press a button that returned one
    // question again — forever. 자유기술 1문항 회사는 실제로 있습니다.
    expect(splitCoverLetterDraft("지원 동기를 말씀드리면...").length).toBe(1);
    expect(page).toContain("const blocksOnUnsplitDraft = unsplitDraft && !splitConfirmed;");
    expect(page).toContain(": blocksOnUnsplitDraft");
  });

  it("확인을 누르면 페이지가 그 사실을 안다", () => {
    expect(intake).toContain("onSplitConfirmed?.(true);");
    expect(page).toContain("onSplitConfirmed={setSplitConfirmed}");
  });

  it("다시 고치면 확인이 풀린다", () => {
    // Otherwise a confirmed one-question split would keep vouching for text
    // that has since been replaced with four questions run together.
    expect(intake).toContain("onSplitConfirmed?.(false);");
    expect(page).toContain("setSplitConfirmed(false);");
  });

  it("안내는 사라지지 않는다", () => {
    // Still worth saying — it just stops being a wall.
    expect(page).toContain("한 문항으로 진행합니다.");
    expect(page).toContain("문항 구분이 아직 안 되어 있어요.");
  });
});
