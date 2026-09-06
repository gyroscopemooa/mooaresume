import { describe, expect, it } from "vitest";
import {
  buildPortfolioBuildPrompt,
  countPortfolioBuildSourceCharacters,
  describePortfolioBuildResult,
  filledProjects,
  hasEnoughPortfolioBuildSource,
  normalizePortfolioBuildOutput,
  type PortfolioBuildOutput,
  type PortfolioBuildSource,
  type PortfolioProject,
  type PortfolioProjectInput,
} from "./portfolio-build";

function project(overrides: Partial<PortfolioProjectInput> = {}): PortfolioProjectInput {
  return { id: "p1", title: "사내 재고 관리 개편", period: "2024.03 ~ 2024.09", note: "엑셀로 관리하던 재고를 웹으로 옮겼습니다.", ...overrides };
}

function source(overrides: Partial<PortfolioBuildSource> = {}): PortfolioBuildSource {
  return { id: "s1", filename: "기획서.pdf", extension: "pdf", sizeBytes: 1000, text: "재고 관리 개편 기획서", kind: "OTHER", ...overrides };
}

function outputProject(overrides: Partial<PortfolioProject> = {}): PortfolioProject {
  return {
    index: 1, title: "사내 재고 관리 개편", period: "2024.03 ~ 2024.09", oneLiner: "엑셀 재고를 웹으로",
    summary: "재고 현황을 웹에서 보게 만든 프로젝트", role: "기획", problem: "엑셀 파일이 흩어져 있었다",
    actions: ["요구사항 정리"], results: ["집계 시간 단축"], skills: "기획, SQL", evidence: "기획서.pdf",
    ...overrides,
  };
}

function emptyOutput(overrides: Partial<PortfolioBuildOutput> = {}): PortfolioBuildOutput {
  return { headline: "", tableOfContents: [], projects: [], notes: [], ...overrides };
}

describe("프로젝트 칸 세기", () => {
  it("이름도 설명도 없는 빈 칸은 프로젝트로 세지 않는다", () => {
    expect(filledProjects([project(), project({ id: "p2", title: "  ", note: "  " })])).toHaveLength(1);
  });

  it("프로젝트 글자와 파일 글자를 합쳐 최소치를 넘으면 결제를 연다", () => {
    const request = { projects: [project({ note: "가".repeat(60) })], direction: "", sources: [source({ text: "나".repeat(60) })] };
    expect(countPortfolioBuildSourceCharacters(request)).toBeGreaterThan(100);
    expect(hasEnoughPortfolioBuildSource(request)).toBe(true);
  });

  it("글자가 없는 스캔본은 세지 않는다", () => {
    const request = { projects: [], direction: "", sources: [source({ text: "", unreadable: true })] };
    expect(countPortfolioBuildSourceCharacters(request)).toBe(0);
    expect(hasEnoughPortfolioBuildSource(request)).toBe(false);
  });
});

describe("프롬프트 조립", () => {
  it("프로젝트마다 번호를 붙인다 — 한 프로젝트의 성과가 다른 프로젝트로 넘어가지 않게", () => {
    const prompt = buildPortfolioBuildPrompt({
      projects: [project(), project({ id: "p2", title: "채용 페이지 개편" })],
      direction: "",
      sources: [],
    });
    expect(prompt.text).toContain("[프로젝트 1]");
    expect(prompt.text).toContain("[프로젝트 2]");
  });

  it("지원 방향을 적으면 맨 앞에 붙인다", () => {
    const prompt = buildPortfolioBuildPrompt({ projects: [project()], direction: "서비스 기획자", sources: [] });
    expect(prompt.text.startsWith("[지원 방향]\n서비스 기획자")).toBe(true);
  });

  it("빈 칸은 프롬프트에 넣지 않는다", () => {
    const prompt = buildPortfolioBuildPrompt({
      projects: [project(), project({ id: "p2", title: "", note: "" })],
      direction: "",
      sources: [],
    });
    expect(prompt.text).not.toContain("[프로젝트 2]");
  });
});

describe("결과 정리", () => {
  it("목차는 프로젝트 목록에서 다시 만든다 — 모델이 적은 목차가 본문과 어긋나면 안 된다", () => {
    const output = normalizePortfolioBuildOutput(emptyOutput({
      tableOfContents: ["1. 없는 프로젝트"],
      projects: [outputProject()],
    }));
    expect(output.tableOfContents).toEqual(["1. 사내 재고 관리 개편 — 엑셀 재고를 웹으로"]);
  });

  it("아무 내용도 없는 프로젝트는 버린다", () => {
    const output = normalizePortfolioBuildOutput(emptyOutput({
      projects: [outputProject({ index: 2, title: " ", summary: " ", actions: [] })],
    }));
    expect(output.projects).toHaveLength(0);
  });

  it("찾은 것이 없으면 그렇다고 말한다", () => {
    expect(describePortfolioBuildResult(emptyOutput())).toContain("찾지 못했습니다");
  });
});
