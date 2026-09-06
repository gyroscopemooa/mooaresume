import { describe, expect, it } from "vitest";
import {
  buildCareerDescriptionBuildPrompt,
  countCareerDescriptionBuildSourceCharacters,
  describeCareerDescriptionBuildResult,
  formatCareerDescriptionDuration,
  hasEnoughCareerDescriptionBuildSource,
  normalizeCareerDescriptionBuildOutput,
  CAREER_DESCRIPTION_BUILD_MAX_SOURCE_CHARS,
  type CareerDescriptionBuildOutput,
  type CareerDescriptionBuildSource,
} from "./career-description-build";

function source(overrides: Partial<CareerDescriptionBuildSource> = {}): CareerDescriptionBuildSource {
  return { id: "s1", filename: "경력기술서.pdf", extension: "pdf", sizeBytes: 1000, text: "재직기간 2021.03 ~ 2023.05", kind: "CAREER_DOCUMENT", ...overrides };
}

function emptyOutput(overrides: Partial<CareerDescriptionBuildOutput> = {}): CareerDescriptionBuildOutput {
  return { headline: "", entries: [], supportingFacts: [], notes: [], ...overrides };
}

describe("자료 세기", () => {
  it("글자가 없는 스캔본은 세지 않는다", () => {
    const request = { narrative: "", direction: "", sources: [source({ text: "", unreadable: true })] };
    expect(countCareerDescriptionBuildSourceCharacters(request)).toBe(0);
    expect(hasEnoughCareerDescriptionBuildSource(request)).toBe(false);
  });

  it("줄글과 파일 글자를 합쳐 최소치를 넘으면 결제를 연다", () => {
    const request = { narrative: "가".repeat(50), direction: "", sources: [source({ text: "나".repeat(50) })] };
    expect(hasEnoughCareerDescriptionBuildSource(request)).toBe(true);
  });
});

describe("프롬프트 조립", () => {
  it("방향을 적으면 맨 앞에 붙인다", () => {
    const prompt = buildCareerDescriptionBuildPrompt({
      narrative: "2021년부터 품질관리",
      direction: "심리상담사 쪽으로",
      sources: [],
    });
    expect(prompt.text.startsWith("[만들 방향]\n심리상담사 쪽으로")).toBe(true);
  });

  it("자료마다 무엇인지 이름을 붙인다", () => {
    const prompt = buildCareerDescriptionBuildPrompt({
      narrative: "",
      direction: "",
      sources: [source({ filename: "예전자소서.docx", kind: "COVER_LETTER", text: "저는 성실합니다" })],
    });
    expect(prompt.text).toContain("[자료 1 · 자기소개서 · 예전자소서.docx]");
    expect(prompt.truncated).toEqual([]);
  });

  it("상한을 넘으면 잘린 자료의 이름을 돌려준다", () => {
    const prompt = buildCareerDescriptionBuildPrompt({
      narrative: "가".repeat(CAREER_DESCRIPTION_BUILD_MAX_SOURCE_CHARS),
      direction: "",
      sources: [source({ filename: "뒤로밀린자료.pdf" })],
    });
    expect(prompt.truncated).toContain("뒤로밀린자료.pdf");
  });
});

describe("근무 기간 계산", () => {
  it("연-월을 붙여 개월 수를 센다", () => {
    expect(formatCareerDescriptionDuration("2021.03 ~ 2021.05")).toBe("3개월");
  });

  it("1년이 넘으면 년과 개월로 나눈다", () => {
    expect(formatCareerDescriptionDuration("2021.01 ~ 2022.06")).toBe("1년 6개월");
  });

  it("알아볼 수 없는 표기는 계산하지 않고 빈 문자열을 돌려준다 — 사람이 세게 만들지 않는다", () => {
    expect(formatCareerDescriptionDuration("2021년 봄부터 지금까지")).toBe("");
  });

  it("재직중은 오늘까지로 센다", () => {
    const result = formatCareerDescriptionDuration("2020.01 ~ 재직중");
    expect(result).not.toBe("");
  });
});

describe("결과 정리", () => {
  it("아무것도 안 적힌 줄은 버린다", () => {
    const output = normalizeCareerDescriptionBuildOutput(emptyOutput({
      entries: [
        { company: "  ", department: "", roleTitle: "", period: "", duties: [], achievement: "", evidence: "" },
        { company: " 무아 ", department: "품질팀", roleTitle: "사원", period: "2021.03~2023.05", duties: [" 검사 ", ""], achievement: "", evidence: "경력증명서.pdf" },
      ],
    }));
    expect(output.entries).toHaveLength(1);
    expect(output.entries[0]).toMatchObject({ company: "무아", duties: ["검사"] });
  });

  it("찾은 것이 없으면 그렇다고 말한다", () => {
    expect(describeCareerDescriptionBuildResult(emptyOutput())).toContain("찾지 못했습니다");
  });

  it("찾은 것이 있으면 건수를 말한다", () => {
    const output = emptyOutput({
      entries: [{ company: "무아", department: "", roleTitle: "", period: "", duties: [], achievement: "", evidence: "" }],
    });
    expect(describeCareerDescriptionBuildResult(output)).toContain("경력 1건");
  });
});
