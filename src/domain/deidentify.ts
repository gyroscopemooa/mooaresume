/**
 * Stripping the person out of an application before it is kept for research.
 *
 * The landing page promises that anything learned from real applications is
 * learned from anonymised copies. This is the code that has to make that true,
 * and it is the reason the promise is written in the future tense until it
 * ships: a claim about de-identification is worth exactly as much as the
 * function behind it.
 *
 * Two failure directions, and only one of them is visible:
 *
 * - Removing too little leaves a phone number in a stored document. Nobody
 *   notices until it matters, and by then it is a breach.
 * - Removing too much quietly destroys the thing being studied. Dates, job
 *   titles, company names and achievement figures are the whole reason to keep
 *   an application at all; a redactor that eats "2023.03~2024.07" or "불량률
 *   12% 감소" leaves a corpus that cannot answer any question.
 *
 * So the rules here are deliberately narrow and each one is anchored to
 * something that cannot be a date or a metric. What survives is stated as
 * plainly as what goes: see the tests, which assert both directions.
 */

/**
 * The wording of the consent currently in force.
 *
 * Bumping this invalidates every earlier agreement: the sentences someone said
 * yes to are part of what they said yes to, so a copy change cannot inherit the
 * old consent. Raise it whenever the promise changes meaning — not for a typo,
 * always for a new use.
 *
 * Lives here rather than beside either the screen or the capture path because
 * both need it and two copies would drift. A drifted version means consent
 * silently stops matching and nothing is collected at all — a failure that
 * looks exactly like nothing happening.
 */
export const RESEARCH_CONSENT_VERSION = "2026-08-24";

export type RedactionKind =
  | "national_id"
  | "phone"
  | "email"
  | "url"
  | "address"
  | "name";

export const REDACTION_LABEL: Record<RedactionKind, string> = {
  national_id: "주민등록번호",
  phone: "전화번호",
  email: "이메일",
  url: "링크",
  address: "주소",
  name: "이름",
};

const PLACEHOLDER: Record<RedactionKind, string> = {
  national_id: "[주민번호]",
  phone: "[전화번호]",
  email: "[이메일]",
  url: "[링크]",
  address: "[주소]",
  name: "[이름]",
};

/**
 * Order matters. The national id runs before the phone rule because its second
 * half looks like a phone number's tail, and the email runs before the URL rule
 * because an address contains a host.
 */
const PATTERNS: Array<{ kind: RedactionKind; pattern: RegExp }> = [
  // 6 digits, a separator, 7 digits. Nothing else in an application takes this
  // shape, so it can be matched on its own.
  { kind: "national_id", pattern: /\b\d{6}\s*[-–—]\s*\d{7}\b/g },
  { kind: "email", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { kind: "url", pattern: /\bhttps?:\/\/[^\s<>"']+/g },
  // Mobile numbers are anchored on the 01x prefix. A generic \d{2,4}-\d{4}
  // rule would swallow 2023-2024 and every account-like figure in a résumé.
  { kind: "phone", pattern: /\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b/g },
  // Landlines need the leading 0 and a real area code, again to stay clear of
  // year ranges.
  { kind: "phone", pattern: /\b0(?:2|[3-6][1-5]|70|50\d)[-.\s]\d{3,4}[-.\s]\d{4}\b/g },
  // Anchored on the road-name suffix plus a building number, which is what
  // makes it an address rather than a place name. "울산광역시" alone stays: the
  // region an applicant worked in is analytically useful and identifies nobody.
  { kind: "address", pattern: /[가-힣0-9]+(?:로|길)\s?\d+(?:-\d+)?(?:번길\s?\d+)?(?:,?\s?\d+동)?(?:,?\s?\d+호)?/g },
];

export type RedactionCount = { kind: RedactionKind; count: number };

export type RedactionResult = {
  text: string;
  removed: RedactionCount[];
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Names cannot be found by shape — a two-or-three syllable Korean word is most
 * of the language — so they are only removed when we are told what they are.
 * The caller passes the names it already holds (the account's own name, the
 * filename the applicant uploaded), and nothing is guessed.
 */
function buildNamePatterns(names: readonly string[]): RegExp[] {
  return names
    .map((name) => name.trim())
    .filter((name) => name.length >= 2 && name.length <= 20)
    .map((name) => new RegExp(escapeRegExp(name), "g"));
}

export function redactPersonalData(
  text: string,
  options: { knownNames?: readonly string[] } = {},
): RedactionResult {
  const counts = new Map<RedactionKind, number>();
  let output = text;

  const apply = (kind: RedactionKind, pattern: RegExp) => {
    output = output.replace(pattern, () => {
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
      return PLACEHOLDER[kind];
    });
  };

  for (const { kind, pattern } of PATTERNS) apply(kind, pattern);
  for (const pattern of buildNamePatterns(options.knownNames ?? [])) apply("name", pattern);

  return {
    text: output,
    removed: [...counts.entries()].map(([kind, count]) => ({ kind, count })),
  };
}

/**
 * What the redactor did, for the operator — and, when asked, for the applicant.
 *
 * "개인정보를 제거했습니다" is not checkable. Naming the kinds and the counts is.
 */
export function describeRedaction(removed: readonly RedactionCount[]): string {
  if (removed.length === 0) return "지울 개인정보를 찾지 못했습니다.";
  return removed.map((item) => `${REDACTION_LABEL[item.kind]} ${item.count}건`).join(" · ");
}

/**
 * The redactor is a floor, not a guarantee, and saying so is part of doing this
 * honestly. A name written only inside a sentence, a company small enough that
 * naming it names the person — those survive this pass.
 *
 * This is why the consent copy asks permission for *anonymised* use rather than
 * promising anonymity as an accomplished fact, and why the stored copy is never
 * shown to anyone outside the team.
 */
export const REDACTION_LIMITS = [
  "이름은 저희가 이미 알고 있는 이름만 지웁니다. 문장 안에만 등장하는 다른 사람의 이름은 남을 수 있습니다.",
  "회사명·학교명·직무명은 분석에 필요해 남깁니다. 소속이 아주 특정한 경우 그것만으로 사람이 좁혀질 수 있습니다.",
  "기간·수치·성과는 그대로 둡니다. 이것을 지우면 남는 자료로 아무것도 알 수 없습니다.",
];
