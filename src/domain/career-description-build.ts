import { z } from "zod";
import { CLASSIFIED_KIND_LABEL, classifiedKindSchema, type ClassifiedKind } from "./document-classify";

/**
 * AI 경력기술서 제작 — 흩어진 자료를 회사·기간·업무 줄로 정리해 주는 유료 기능.
 *
 * `docs/career-document-builder-plan.md`(직무기술서 만들어주기)에서 다루던 것을
 * 실제로 만듭니다. 이력서·자기소개서·자격증·수료증·해외경험처럼 이미 따로
 * 가지고 있는 자료를 한꺼번에 받아, 회사별로 소속·직무·기간·담당업무·성과를
 * 정리한 문서 하나로 합칩니다. 방향(`direction`)을 적으면 같은 자료에서도
 * 무엇을 앞에 두고 무엇을 줄일지가 바뀝니다 — 사실을 바꾸는 것이 아니라 순서와
 * 분량만 바꾸는 것이라 이 선 안에서는 안전합니다.
 *
 * 가장 큰 위험은 "근거가 없다"가 아니라 **여러 자료를 합치는 과정에서 근거가
 * 어디였는지 잃어버리는 것**입니다(계획 문서 4절). 그래서 결과의 각 줄에
 * `evidence`를 함께 받습니다 — 어느 자료에서 나온 사실인지 사람이 바로 확인할
 * 수 있어야, 합치는 순간에 어긋난 것이 드러납니다.
 *
 * 이력서 제작(`resume-build.ts`)과 쌍둥이 구조입니다. 합치지 않은 이유도
 * 같습니다 — 이쪽은 결과를 기존 폼에 얹지 않고 그 자체로 완성 문서이므로,
 * 게이트웨이 요청 모양과 결제 경로가 자연히 갈라집니다.
 */

/**
 * 1건 정액. 이력서 제작(3,900원)보다 위, QUICK 첨삭(5,900원)보다 위에 둡니다.
 * 이력서 제작은 "옮겨 적기"이지만 이것은 여러 자료를 종합해 방향까지 반영해
 * 새 문서를 짜는 일이라 원가가 더 듭니다. 실제 판매 데이터가 없는 첫 가격이므로
 * 출시 전 조정 대상입니다(`docs/agent-change-log.md` 참고).
 */
export const CAREER_DESCRIPTION_BUILD_PRICE_KRW = 7_900;

export const CAREER_DESCRIPTION_BUILD_MAX_SOURCE_CHARS = 40_000;
export const CAREER_DESCRIPTION_BUILD_MAX_NARRATIVE_CHARS = 12_000;
/** "심리상담사 쪽으로"처럼 짧게 받습니다. 긴 글을 넣으면 방향이 아니라 본문이 됩니다. */
export const CAREER_DESCRIPTION_BUILD_MAX_DIRECTION_CHARS = 200;
export const CAREER_DESCRIPTION_BUILD_MAX_FILES = 10;
export const CAREER_DESCRIPTION_BUILD_MIN_SOURCE_CHARS = 80;

export type CareerDescriptionBuildSource = {
  id: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  text: string;
  kind: ClassifiedKind;
  unreadable?: boolean;
};

export const careerDescriptionBuildSourceSchema = z.object({
  id: z.string().min(1).max(80),
  filename: z.string().min(1).max(260),
  extension: z.string().max(16),
  sizeBytes: z.number().int().nonnegative(),
  text: z.string().max(CAREER_DESCRIPTION_BUILD_MAX_SOURCE_CHARS),
  kind: classifiedKindSchema,
  unreadable: z.boolean().optional(),
});

export const careerDescriptionBuildRequestSchema = z.object({
  narrative: z.string().max(CAREER_DESCRIPTION_BUILD_MAX_NARRATIVE_CHARS),
  direction: z.string().max(CAREER_DESCRIPTION_BUILD_MAX_DIRECTION_CHARS),
  sources: z.array(careerDescriptionBuildSourceSchema).max(CAREER_DESCRIPTION_BUILD_MAX_FILES),
});
export type CareerDescriptionBuildRequest = z.infer<typeof careerDescriptionBuildRequestSchema>;

function readableSources(sources: readonly CareerDescriptionBuildSource[]): CareerDescriptionBuildSource[] {
  return sources.filter((source) => !source.unreadable && source.text.trim().length > 0);
}

export function countCareerDescriptionBuildSourceCharacters(request: CareerDescriptionBuildRequest): number {
  const files = readableSources(request.sources).reduce((total, source) => total + source.text.trim().length, 0);
  return request.narrative.trim().length + files;
}

export function hasEnoughCareerDescriptionBuildSource(request: CareerDescriptionBuildRequest): boolean {
  return countCareerDescriptionBuildSourceCharacters(request) >= CAREER_DESCRIPTION_BUILD_MIN_SOURCE_CHARS;
}

export type CareerDescriptionBuildPrompt = { text: string; truncated: string[] };

/**
 * 자료를 모델이 읽을 한 덩이로 만듭니다. 이력서 제작과 같은 순서 원칙입니다 —
 * 줄글(가장 최신, 잘리면 안 됨)을 맨 앞에, 그다음 자료마다 이름표를 붙여 나열합니다.
 * 이름표가 없으면 자격증 옆에 붙은 업무가 다른 회사 것으로 섞여 들어갑니다.
 */
export function buildCareerDescriptionBuildPrompt(request: CareerDescriptionBuildRequest): CareerDescriptionBuildPrompt {
  const blocks: string[] = [];
  const truncated: string[] = [];
  let remaining = CAREER_DESCRIPTION_BUILD_MAX_SOURCE_CHARS;

  const direction = request.direction.trim();
  if (direction) blocks.push(`[만들 방향]\n${direction}`);

  const narrative = request.narrative.trim();
  if (narrative) {
    const used = narrative.slice(0, remaining);
    if (used.length < narrative.length) truncated.push("본인이 적은 설명");
    remaining -= used.length;
    blocks.push(`[본인이 적은 설명]\n${used}`);
  }

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

/**
 * 모델이 돌려주는 모양. 배열 개수·문자열 길이 제한은 넣지 않습니다 — OpenAI
 * strict 스키마가 아직 그 키워드를 받지 않습니다(이력서 제작과 같은 제약).
 * 개수는 받은 뒤 `normalizeCareerDescriptionBuildOutput`에서 자릅니다.
 */
export const careerDescriptionEntrySchema = z.object({
  company: z.string(),
  department: z.string(),
  roleTitle: z.string(),
  /** 자료에 적힌 그대로. "2021.03 ~ 2023.05"처럼. 모델이 개월 수를 계산하지 않습니다 — 계산은 코드가 합니다. */
  period: z.string(),
  duties: z.array(z.string()),
  achievement: z.string(),
  /** 이 줄이 어느 자료에서 왔는지. "경력증명서.pdf" 또는 "본인이 적은 설명"처럼 짧게. */
  evidence: z.string(),
});
export type CareerDescriptionEntry = z.infer<typeof careerDescriptionEntrySchema>;

export const careerDescriptionSupportSchema = z.object({
  title: z.string(),
  period: z.string(),
  detail: z.string(),
  evidence: z.string(),
});
export type CareerDescriptionSupport = z.infer<typeof careerDescriptionSupportSchema>;

export const careerDescriptionBuildOutputSchema = z.object({
  headline: z.string(),
  entries: z.array(careerDescriptionEntrySchema),
  /** 자격증·수료증·해외경험처럼 특정 회사에 매이지 않는 사실. */
  supportingFacts: z.array(careerDescriptionSupportSchema),
  notes: z.array(z.string()),
});
export type CareerDescriptionBuildOutput = z.infer<typeof careerDescriptionBuildOutputSchema>;

const MAX_ENTRIES = 20;
const MAX_DUTIES_PER_ENTRY = 8;
const MAX_SUPPORT = 20;
const MAX_NOTES = 8;

function hasContent(values: readonly string[]): boolean {
  return values.some((value) => value.trim().length > 0);
}

/** 개월 수를 사람이 세게 만들지 않습니다. "YYYY.MM ~ YYYY.MM" 또는 "~ 재직중"만 계산하고, 그 밖의 표기는 그대로 둡니다. */
export function formatCareerDescriptionDuration(period: string): string {
  const match = period.trim().match(/^(\d{4})[.\-/](\d{1,2})\s*~\s*(?:(\d{4})[.\-/](\d{1,2})|(재직\s*중|현재|present))$/i);
  if (!match) return "";
  const startYear = Number(match[1]);
  const startMonth = Number(match[2]);
  const ongoing = Boolean(match[5]);
  const endYear = ongoing ? new Date().getUTCFullYear() : Number(match[3]);
  const endMonth = ongoing ? new Date().getUTCMonth() + 1 : Number(match[4]);
  if (startMonth < 1 || startMonth > 12 || (!ongoing && (endMonth < 1 || endMonth > 12))) return "";
  const months = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  if (months <= 0) return "";
  if (months < 12) return `${months}개월`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years}년 ${rest}개월` : `${years}년`;
}

/** 개수와 공백을 여기서 정리합니다. 스키마로 막을 수 없는 것들입니다. */
export function normalizeCareerDescriptionBuildOutput(output: CareerDescriptionBuildOutput): CareerDescriptionBuildOutput {
  return {
    headline: output.headline.trim(),
    entries: output.entries
      .map((entry) => ({
        company: entry.company.trim(),
        department: entry.department.trim(),
        roleTitle: entry.roleTitle.trim(),
        period: entry.period.trim(),
        duties: entry.duties.map((duty) => duty.trim()).filter(Boolean).slice(0, MAX_DUTIES_PER_ENTRY),
        achievement: entry.achievement.trim(),
        evidence: entry.evidence.trim(),
      }))
      .filter((entry) => hasContent([entry.company, entry.department, entry.roleTitle, entry.period]) || entry.duties.length > 0)
      .slice(0, MAX_ENTRIES),
    supportingFacts: output.supportingFacts
      .map((row) => ({ title: row.title.trim(), period: row.period.trim(), detail: row.detail.trim(), evidence: row.evidence.trim() }))
      .filter((row) => hasContent([row.title, row.detail]))
      .slice(0, MAX_SUPPORT),
    notes: output.notes.map((note) => note.trim()).filter(Boolean).slice(0, MAX_NOTES),
  };
}

/** 무엇이 채워졌는지 한 줄로. 결과 화면이 그대로 읽어 줍니다. */
export function describeCareerDescriptionBuildResult(output: CareerDescriptionBuildOutput): string {
  const filled = normalizeCareerDescriptionBuildOutput(output);
  const parts = [
    filled.entries.length ? `경력 ${filled.entries.length}건` : "",
    filled.supportingFacts.length ? `참고사항 ${filled.supportingFacts.length}건` : "",
  ].filter(Boolean);
  return parts.length ? `${parts.join(" · ")}을 정리했습니다.` : "자료에서 정리할 경력을 찾지 못했습니다.";
}
