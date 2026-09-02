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
  /**
   * 고르지 못했다는 뜻입니다.
   *
   * A guess that is wrong in the 채용공고 direction is not a small annoyance: it
   * is the one label that takes a document out of the evidence pool, so a
   * career file landing there loses the applicant their own history and the run
   * fails on a quote it cannot verify. When the filename and the text disagree,
   * saying nothing and asking is cheaper than being confidently wrong.
   */
  "UNSET",
  "JOB_POSTING",
  "COVER_LETTER",
  "RESUME",
  "CAREER_DOCUMENT",
  "PORTFOLIO",
  /**
   * 자격증·증명서·성적표.
   *
   * 예전에는 이것들이 전부 `OTHER`로 들어갔고, `OTHER`는 참고자료로만 쓰입니다.
   * 그런데 FINAL이 파는 것이 **이력서 × 자소서 교차검증**입니다. 자소서에
   * "직업상담사 2급 보유"라고 쓴 사람이 자격증을 올려도, 그것이 참고자료
   * 더미에 들어가면 그 주장은 여전히 "근거가 확인되지 않은 주장"으로 깎입니다.
   * 근거로 쓰라고 올린 파일이 근거로 안 쓰이는 자리였습니다.
   *
   * 학교 성적표와 생활기록부도 여기입니다. 대기업 생산직처럼 실제로 제출을
   * 요구하는 전형이 있고, 그때는 자소서에 적은 학교 이야기와 대조할 수 있는
   * 유일한 문서입니다.
   */
  "CERTIFICATE",
  "OTHER",
]);

export type ClassifiedKind = z.infer<typeof classifiedKindSchema>;

export const CLASSIFIED_KIND_LABEL: Record<ClassifiedKind, string> = {
  UNSET: "분류를 골라 주세요",
  JOB_POSTING: "채용공고",
  COVER_LETTER: "자기소개서",
  RESUME: "이력서",
  CAREER_DOCUMENT: "경력기술서",
  PORTFOLIO: "포트폴리오",
  CERTIFICATE: "자격·증명서",
  OTHER: "기타 자료",
};

/** The order the confirmation screen lists them in: what the analysis leans on most, first. */
export const CLASSIFIED_KIND_ORDER: readonly ClassifiedKind[] = [
  "JOB_POSTING",
  "COVER_LETTER",
  "RESUME",
  "CAREER_DOCUMENT",
  "PORTFOLIO",
  "CERTIFICATE",
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
  // 단독 `채용`만 뺐습니다. 채용대행·채용마케팅·채용담당처럼 지원자 본인
  // 서류에 흔히 들어가는 낱말이라, 실제로 `채용대행`이 적힌 경력 파일이 공고로
  // 분류되어 근거에서 빠졌고 결제한 분석이 실패했습니다. `공고`는 그대로 둡니다
  // — 현대차공고.pdf처럼 회사 이름에 붙여 쓰는 쪽이 훨씬 흔하고, 본인 서류
  // 이름에는 거의 오지 않습니다.
  ["JOB_POSTING", /채용\s*공고|모집\s*공고|구인\s*공고|공고|job\s*(posting|description)|\bjd\b|recruit/i],
  ["RESUME", /이력서|입사지원서|지원서|resume|cv\b|profile/i],
  ["PORTFOLIO", /포트폴리오|portfolio|작품집|프로젝트\s*모음/i],
  // 학교 서류를 함께 둡니다. 생활기록부·성적표는 이름에 "증명서"가 없어서
  // 어느 규칙에도 걸리지 않았고, 그래서 분류를 고르지 못한 자료로 남았습니다.
  // 한국 자격증은 이름에 "자격증"이 안 들어갑니다. `직업상담사2급.pdf`처럼
  // 종목 이름과 급수만 적습니다. 그래서 급수(`2급`)와 흔한 종목 어미
  // (`~사`, `기능사`, `기술사`)까지 봅니다.
  //
  // 이 줄이 목록의 **맨 끝**인 것이 안전장치입니다. 자기소개서·이력서·
  // 경력기술서 규칙이 먼저 걸리므로, 넓은 규칙이 그것들을 삼키지 않습니다.
  ["CERTIFICATE", /자격증|자격\s*수첩|면허|수료|증명서|성적\s*증명|생활\s*기록부|학교\s*생활|성적표|certificate|license|transcript|award|수상|기능사|기능장|기술사|산업기사|정보처리|상담사|관리사|\d\s*급/i],
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
  basis: "filename" | "content" | "conflict" | "fallback";
};

function guessFromFilename(filename: string): ClassifiedKind | null {
  for (const [kind, pattern] of FILENAME_HINTS) if (pattern.test(filename)) return kind;
  return null;
}

function guessFromContent(text: string): ClassifiedKind | null {
  const head = text.slice(0, CONTENT_WINDOW);
  if (!head.trim()) return null;
  let best: { kind: ClassifiedKind; score: number } | null = null;
  for (const [kind, pattern] of CONTENT_HINTS) {
    const score = head.match(pattern)?.length ?? 0;
    // Strictly greater, so a tie leaves the earlier (more decisive) kind in
    // place rather than letting position at the bottom of the list win.
    if (score > 0 && (!best || score > best.score)) best = { kind, score };
  }
  return best?.kind ?? null;
}

export function classifyDocument(input: ClassifyInput): Classification {
  const filename = (input.filename ?? "").trim();
  const text = input.text ?? "";
  const byName = filename ? guessFromFilename(filename) : null;
  const byContent = guessFromContent(text);

  // 두 신호가 어긋나면 고르지 않습니다.
  //
  // Either one alone is a reasonable guess. Together and disagreeing, they mean
  // the file does not look like what it is called, and picking a side is how a
  // career document ends up labelled 채용공고. The applicant knows; the screen
  // asks them.
  if (byName && byContent && byName !== byContent) return { kind: "UNSET", basis: "conflict" };
  if (byName) return { kind: byName, basis: "filename" };
  if (byContent) return { kind: byContent, basis: "content" };

  // Typed or pasted text with no filename and no headings is almost always the
  // letter itself — that is what the box asks for first.
  if (!filename && text.trim()) return { kind: "COVER_LETTER", basis: "fallback" };
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
