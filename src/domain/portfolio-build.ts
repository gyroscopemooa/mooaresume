import { z } from "zod";
import { CLASSIFIED_KIND_LABEL, classifiedKindSchema, type ClassifiedKind } from "./document-classify";

/**
 * AI 포트폴리오 설명글 제작.
 *
 * 파는 것은 **디자인이 아니라 글**입니다. PPT 서식을 만들어 주지 않습니다 —
 * 포트폴리오에서 사람이 제일 오래 막히는 것은 배치가 아니라 "이 프로젝트를
 * 뭐라고 설명하지"이고, 그건 디자이너도 개발자도 똑같이 막힙니다.
 *
 * 그래서 프로젝트마다 아래를 만들어 줍니다.
 *   한 줄 요약 · 소개 · 담당 역할 · 문제 · 실행 · 성과 · 사용 기술/역량
 * 그리고 프로젝트 전체를 훑는 목차를 냅니다.
 *
 * 앞의 두 빌더(이력서·경력기술서)와 입력 모양이 하나 다릅니다. 저쪽은 자료를
 * 한 덩이로 받으면 됐지만, 포트폴리오는 **프로젝트라는 단위가 먼저** 있습니다.
 * 프로젝트 세 개를 한 칸에 몰아 적게 하면 모델이 A의 성과를 B에 붙입니다.
 * 그래서 입력도 프로젝트별로 칸을 나눠 받습니다.
 */

export { PORTFOLIO_BUILD_PRICE_KRW } from "./builder-pricing";

export const PORTFOLIO_BUILD_MAX_SOURCE_CHARS = 40_000;
export const PORTFOLIO_BUILD_MAX_PROJECTS = 12;
export const PORTFOLIO_BUILD_MAX_PROJECT_NOTE_CHARS = 4_000;
export const PORTFOLIO_BUILD_MAX_DIRECTION_CHARS = 200;
export const PORTFOLIO_BUILD_MAX_FILES = 10;
export const PORTFOLIO_BUILD_MIN_SOURCE_CHARS = 80;

export type PortfolioBuildSource = {
  id: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  text: string;
  kind: ClassifiedKind;
  unreadable?: boolean;
};

export const portfolioBuildSourceSchema = z.object({
  id: z.string().min(1).max(80),
  filename: z.string().min(1).max(260),
  extension: z.string().max(16),
  sizeBytes: z.number().int().nonnegative(),
  text: z.string().max(PORTFOLIO_BUILD_MAX_SOURCE_CHARS),
  kind: classifiedKindSchema,
  unreadable: z.boolean().optional(),
});

/** 사람이 화면에서 채우는 프로젝트 한 칸. 이름조차 비어 있을 수 있습니다 — 빈 칸은 보내기 전에 걸러집니다. */
export type PortfolioProjectInput = { id: string; title: string; period: string; note: string };

export const portfolioProjectInputSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().max(120),
  period: z.string().max(60),
  note: z.string().max(PORTFOLIO_BUILD_MAX_PROJECT_NOTE_CHARS),
});

export const portfolioBuildRequestSchema = z.object({
  projects: z.array(portfolioProjectInputSchema).max(PORTFOLIO_BUILD_MAX_PROJECTS),
  direction: z.string().max(PORTFOLIO_BUILD_MAX_DIRECTION_CHARS),
  sources: z.array(portfolioBuildSourceSchema).max(PORTFOLIO_BUILD_MAX_FILES),
});
export type PortfolioBuildRequest = z.infer<typeof portfolioBuildRequestSchema>;

function readableSources(sources: readonly PortfolioBuildSource[]): PortfolioBuildSource[] {
  return sources.filter((source) => !source.unreadable && source.text.trim().length > 0);
}

/** 이름만 적고 내용이 없는 칸은 프로젝트로 세지 않습니다. */
export function filledProjects(projects: readonly PortfolioProjectInput[]): PortfolioProjectInput[] {
  return projects.filter((project) => project.title.trim() || project.note.trim());
}

export function countPortfolioBuildSourceCharacters(request: PortfolioBuildRequest): number {
  const projects = filledProjects(request.projects)
    .reduce((total, project) => total + project.title.trim().length + project.note.trim().length, 0);
  const files = readableSources(request.sources).reduce((total, source) => total + source.text.trim().length, 0);
  return projects + files;
}

export function hasEnoughPortfolioBuildSource(request: PortfolioBuildRequest): boolean {
  return countPortfolioBuildSourceCharacters(request) >= PORTFOLIO_BUILD_MIN_SOURCE_CHARS;
}

export type PortfolioBuildPrompt = { text: string; truncated: string[] };

/**
 * 프로젝트를 번호로 묶어 보냅니다.
 *
 * 번호가 핵심입니다. 모델이 결과에서 같은 번호를 그대로 돌려주게 해서, 어느
 * 설명이 어느 프로젝트의 것인지 사람이 대조할 수 있게 합니다. 자료 파일은
 * 프로젝트에 매이지 않은 채로 뒤에 붙습니다 — 어느 프로젝트 것인지는 모델이
 * 내용을 보고 판단하되, 확실하지 않으면 붙이지 말라고 지시문에서 막습니다.
 */
export function buildPortfolioBuildPrompt(request: PortfolioBuildRequest): PortfolioBuildPrompt {
  const blocks: string[] = [];
  const truncated: string[] = [];
  let remaining = PORTFOLIO_BUILD_MAX_SOURCE_CHARS;

  const direction = request.direction.trim();
  if (direction) blocks.push(`[지원 방향]\n${direction}`);

  filledProjects(request.projects).forEach((project, index) => {
    const header = `[프로젝트 ${index + 1}]`;
    const lines = [
      header,
      `이름: ${project.title.trim() || "(적지 않음)"}`,
      `기간: ${project.period.trim() || "(적지 않음)"}`,
      `본인이 적은 설명: ${project.note.trim() || "(적지 않음)"}`,
    ].join("\n");
    const used = lines.slice(0, Math.max(remaining, 0));
    if (used.length < lines.length) truncated.push(`프로젝트 ${index + 1}`);
    remaining -= used.length;
    if (used) blocks.push(used);
  });

  let index = 0;
  for (const source of readableSources(request.sources)) {
    index += 1;
    const label = `[자료 ${index} · ${CLASSIFIED_KIND_LABEL[source.kind]} · ${source.filename}]`;
    if (remaining <= 0) { truncated.push(source.filename); continue; }
    const text = source.text.trim();
    const used = text.slice(0, remaining);
    if (used.length < text.length) truncated.push(source.filename);
    remaining -= used.length;
    blocks.push(`${label}\n${used}`);
  }

  return { text: blocks.join("\n\n"), truncated };
}

export const portfolioProjectSchema = z.object({
  /** 입력에서 준 번호(1부터). 어느 칸의 결과인지 대조하는 열쇠입니다. */
  index: z.number().int(),
  title: z.string(),
  period: z.string(),
  /** 목차와 표지에 쓰는 한 줄. */
  oneLiner: z.string(),
  summary: z.string(),
  role: z.string(),
  problem: z.string(),
  actions: z.array(z.string()),
  results: z.array(z.string()),
  skills: z.string(),
  evidence: z.string(),
});
export type PortfolioProject = z.infer<typeof portfolioProjectSchema>;

export const portfolioBuildOutputSchema = z.object({
  headline: z.string(),
  tableOfContents: z.array(z.string()),
  projects: z.array(portfolioProjectSchema),
  notes: z.array(z.string()),
});
export type PortfolioBuildOutput = z.infer<typeof portfolioBuildOutputSchema>;

const MAX_BULLETS = 8;
const MAX_NOTES = 8;

export function normalizePortfolioBuildOutput(output: PortfolioBuildOutput): PortfolioBuildOutput {
  const projects = output.projects
    .map((project) => ({
      index: project.index,
      title: project.title.trim(),
      period: project.period.trim(),
      oneLiner: project.oneLiner.trim(),
      summary: project.summary.trim(),
      role: project.role.trim(),
      problem: project.problem.trim(),
      actions: project.actions.map((line) => line.trim()).filter(Boolean).slice(0, MAX_BULLETS),
      results: project.results.map((line) => line.trim()).filter(Boolean).slice(0, MAX_BULLETS),
      skills: project.skills.trim(),
      evidence: project.evidence.trim(),
    }))
    .filter((project) => project.title || project.summary || project.actions.length)
    .slice(0, PORTFOLIO_BUILD_MAX_PROJECTS);

  return {
    headline: output.headline.trim(),
    // 목차는 프로젝트에서 다시 만듭니다. 모델이 따로 적은 목차가 본문과
    // 어긋나면(있는데 빠지거나, 없는 것이 적히거나) 그 문서는 신뢰를 잃습니다.
    tableOfContents: projects.map((project, order) => `${order + 1}. ${project.title}${project.oneLiner ? ` — ${project.oneLiner}` : ""}`),
    projects,
    notes: output.notes.map((note) => note.trim()).filter(Boolean).slice(0, MAX_NOTES),
  };
}

export function describePortfolioBuildResult(output: PortfolioBuildOutput): string {
  const filled = normalizePortfolioBuildOutput(output);
  return filled.projects.length
    ? `프로젝트 ${filled.projects.length}건의 설명을 만들었습니다.`
    : "자료에서 설명할 프로젝트를 찾지 못했습니다.";
}
