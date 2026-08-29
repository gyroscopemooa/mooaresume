import { z } from "zod";

/**
 * 자료 자동 분류 — guesses what an uploaded file is, without asking a model.
 *
 * The whole point of the 간편 입력 box is that the applicant throws everything
 * in at once and does not sort it. Something has to sort it, and that something
 * must be free: classification runs **before payment**, so a model call here
 * would spend money on people who never buy.
 *
 * Filename first, then the opening of the text. Both are already in hand — the
 * browser extracted the text to count characters — so this costs nothing but a
 * few regex passes.
 *
 * A guess is a guess. Everything it decides is shown back to the applicant on a
 * confirmation screen they can correct, which is why a wrong guess here is a
 * small annoyance rather than a wrong analysis.
 */

export const classifiedKindSchema = z.enum([
  "JOB_POSTING",
  "COVER_LETTER",
  "RESUME",
  "CAREER_DOCUMENT",
  "PORTFOLIO",
  "OTHER",
]);

export type ClassifiedKind = z.infer<typeof classifiedKindSchema>;

export const CLASSIFIED_KIND_LABEL: Record<ClassifiedKind, string> = {
  JOB_POSTING: "채용공고",
  COVER_LETTER: "자기소개서",
  RESUME: "이력서",
  CAREER_DOCUMENT: "경력기술서",
  PORTFOLIO: "포트폴리오",
  OTHER: "기타 자료",
};

/** The order the confirmation screen lists them in: what the analysis leans on most, first. */
export const CLASSIFIED_KIND_ORDER: readonly ClassifiedKind[] = [
  "JOB_POSTING",
  "COVER_LETTER",
  "RESUME",
  "CAREER_DOCUMENT",
  "PORTFOLIO",
  "OTHER",
];

/**
 * Filename hints, most specific first.
 *
 * Order matters more than it looks. 경력기술서 contains 경력, and 자기소개서
 * shortens to 자소서 — a looser pattern placed earlier would swallow both.
 */
const FILENAME_HINTS: ReadonlyArray<readonly [ClassifiedKind, RegExp]> = [
  ["CAREER_DOCUMENT", /경력기술|경력\s*기술|career\s*description|경력증명/i],
  ["COVER_LETTER", /자기소개|자소서|자기\s*소개|cover\s*letter|coverletter|introduction/i],
  ["JOB_POSTING", /채용\s*공고|모집\s*공고|공고|채용|jd\b|job\s*(posting|description)|recruit/i],
  ["RESUME", /이력서|입사지원서|지원서|resume|cv\b|profile/i],
  ["PORTFOLIO", /포트폴리오|portfolio|작품집|프로젝트\s*모음/i],
  ["OTHER", /자격증|수료|증명서|성적|certificate|license|transcript|award|수상/i],
];

/**
 * Content hints. Weaker than the filename, so they only decide when the
 * filename said nothing — 문서1.pdf, 스캔0001.pdf, and every file someone
 * exported without renaming.
 */
const CONTENT_HINTS: ReadonlyArray<readonly [ClassifiedKind, RegExp]> = [
  ["JOB_POSTING", /(자격\s*요건|우대\s*사항|담당\s*업무|모집\s*분야|근무\s*조건|전형\s*절차|접수\s*기간)/g],
  ["COVER_LETTER", /(지원\s*동기|성장\s*과정|성격의\s*장단점|입사\s*후\s*포부|직무\s*역량|본인의\s*강점)/g],
  ["CAREER_DOCUMENT", /(수행\s*업무|담당\s*프로젝트|주요\s*성과|업무\s*내용|프로젝트\s*개요)/g],
  ["RESUME", /(학\s*력|경\s*력\s*사항|보유\s*기술|자격\s*사항|병역|최종\s*학력)/g],
  ["PORTFOLIO", /(작업물|디자인\s*시안|github\.com|behance|notion\.site)/gi],
];

/** Only the opening is read. A resume's headings are at the top; so are a posting's. */
const CONTENT_WINDOW = 1500;

export type ClassifyInput = { filename?: string; text?: string };

export type Classification = {
  kind: ClassifiedKind;
  /** Which signal decided it. Shown as a quiet hint so a wrong guess is easy to spot. */
  basis: "filename" | "content" | "fallback";
};

export function classifyDocument(input: ClassifyInput): Classification {
  const filename = (input.filename ?? "").trim();
  if (filename) {
    for (const [kind, pattern] of FILENAME_HINTS) {
      if (pattern.test(filename)) return { kind, basis: "filename" };
    }
  }

  const head = (input.text ?? "").slice(0, CONTENT_WINDOW);
  if (head.trim()) {
    let best: { kind: ClassifiedKind; score: number } | null = null;
    for (const [kind, pattern] of CONTENT_HINTS) {
      const score = head.match(pattern)?.length ?? 0;
      // Strictly greater, so a tie leaves the earlier (more decisive) kind in
      // place rather than letting position at the bottom of the list win.
      if (score > 0 && (!best || score > best.score)) best = { kind, score };
    }
    if (best) return { kind: best.kind, basis: "content" };
  }

  // Typed or pasted text with no filename and no headings is almost always the
  // letter itself — that is what the box asks for first.
  if (!filename && (input.text ?? "").trim()) return { kind: "COVER_LETTER", basis: "fallback" };
  return { kind: "OTHER", basis: "fallback" };
}

export type ClassifiedItem = { id: string } & ClassifyInput & { kind: ClassifiedKind; basis: Classification["basis"] };

export function classifyAll(inputs: ReadonlyArray<{ id: string } & ClassifyInput>): ClassifiedItem[] {
  return inputs.map((input) => ({ ...input, ...classifyDocument(input) }));
}

/** 채용공고 · 1개 rows for the confirmation screen, in reading order, empty kinds omitted. */
export function summarizeClassification(items: readonly ClassifiedItem[]): Array<{ kind: ClassifiedKind; label: string; count: number }> {
  return CLASSIFIED_KIND_ORDER
    .map((kind) => ({ kind, label: CLASSIFIED_KIND_LABEL[kind], count: items.filter((item) => item.kind === kind).length }))
    .filter((row) => row.count > 0);
}
