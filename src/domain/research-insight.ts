/**
 * Turning a pile of stored applications into something worth changing a prompt
 * over.
 *
 * Storing is the easy half. The question that decides whether any of it was
 * worth keeping is "so what do we do differently on Monday", and the honest
 * answer only ever comes in one shape: **this objection keeps coming up for
 * this company / this role, and applications that got past screening had it
 * less often.**
 *
 * Two rules run through every function here, and both exist because the
 * alternative is confidently wrong advice:
 *
 * 1. Nothing is reported below a floor. Three applications to one company is
 *    not a pattern about that company, it is three people. A grouping that
 *    happily reports n=1 will produce a rule from noise, and the rule then
 *    goes into a prompt and reaches everyone.
 * 2. Nothing is called a rate that is not one. 서류 합격률 needs applications
 *    whose outcome is actually known; counting "결과 안 알려준 사람" as a
 *    failure would make every number look worse than reality, and dropping
 *    them silently would make it look better. They are counted separately and
 *    shown.
 */

export type CorpusEntry = {
  product: string;
  targetCompany: string | null;
  targetRole: string | null;
  readinessScore: number | null;
  findings: Array<{ kind: string; category?: string; severity?: string; note: string }>;
  outcomeStatus: string | null;
};

/** Below this a group is people, not a pattern. */
export const MIN_GROUP_SIZE = 5;

const PASSED = new Set(["DOCUMENT_PASS", "INTERVIEW_1_PENDING", "INTERVIEW_1_PASS", "INTERVIEW_1_FAIL", "FINAL_INTERVIEW_PENDING", "FINAL_PASS", "FINAL_FAIL"]);
const FAILED = new Set(["DOCUMENT_FAIL"]);

export type OutcomeSplit = {
  /** Got past the document stage, whatever happened afterwards. */
  passed: number;
  failed: number;
  /** Told us nothing, or nothing yet. Never folded into either side. */
  unknown: number;
};

export function splitOutcomes(entries: readonly CorpusEntry[]): OutcomeSplit {
  const split: OutcomeSplit = { passed: 0, failed: 0, unknown: 0 };
  for (const entry of entries) {
    if (entry.outcomeStatus && PASSED.has(entry.outcomeStatus)) split.passed += 1;
    else if (entry.outcomeStatus && FAILED.has(entry.outcomeStatus)) split.failed += 1;
    else split.unknown += 1;
  }
  return split;
}

/**
 * Null unless enough outcomes are actually known.
 *
 * A percentage computed from two known results is a number that looks like
 * knowledge and is not, and it is exactly the kind of figure that ends up on a
 * marketing page.
 */
export function documentPassRate(split: OutcomeSplit): number | null {
  const known = split.passed + split.failed;
  if (known < MIN_GROUP_SIZE) return null;
  return Math.round((split.passed / known) * 100);
}

export type FindingPattern = {
  note: string;
  kind: string;
  total: number;
  /** How often it appeared among applications that got past screening, and among those that did not. */
  amongPassed: number;
  amongFailed: number;
};

/**
 * The objections that recur, most common first.
 *
 * Grouped by the objection's own wording, which is coarse — two phrasings of
 * the same problem count separately. That is deliberate for now: normalising
 * them means deciding they are the same problem, and that decision belongs to a
 * person reading the list, not to a string comparison.
 */
export function findingPatterns(entries: readonly CorpusEntry[], limit = 20): FindingPattern[] {
  const table = new Map<string, FindingPattern>();

  for (const entry of entries) {
    const passed = Boolean(entry.outcomeStatus && PASSED.has(entry.outcomeStatus));
    const failed = Boolean(entry.outcomeStatus && FAILED.has(entry.outcomeStatus));
    // Once per application, not once per mention: an analysis that raises the
    // same objection in three questions is still one application with that
    // problem.
    const seen = new Set<string>();
    for (const finding of entry.findings) {
      const key = `${finding.kind}::${finding.note}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const row = table.get(key) ?? { note: finding.note, kind: finding.kind, total: 0, amongPassed: 0, amongFailed: 0 };
      row.total += 1;
      if (passed) row.amongPassed += 1;
      if (failed) row.amongFailed += 1;
      table.set(key, row);
    }
  }

  return [...table.values()].sort((left, right) => right.total - left.total).slice(0, limit);
}

export type GroupSummary = {
  label: string;
  count: number;
  outcomes: OutcomeSplit;
  passRate: number | null;
  /** The objections most particular to this group, not the ones common everywhere. */
  topFindings: FindingPattern[];
};

/**
 * Groups by company or role, dropping anything too small to mean something.
 *
 * The dropped groups are not hidden — the caller is told how many rows fell
 * below the floor, because "회사별로 15건 있는데 표에는 2개뿐"은 그 자체로
 * 알아야 할 사실입니다.
 */
export function groupBy(
  entries: readonly CorpusEntry[],
  key: "targetCompany" | "targetRole",
  options: { minSize?: number; findingLimit?: number } = {},
): { groups: GroupSummary[]; belowFloor: number; unlabelled: number } {
  const minSize = options.minSize ?? MIN_GROUP_SIZE;
  const buckets = new Map<string, CorpusEntry[]>();
  let unlabelled = 0;

  for (const entry of entries) {
    const label = entry[key]?.trim();
    if (!label) {
      unlabelled += 1;
      continue;
    }
    const bucket = buckets.get(label) ?? [];
    bucket.push(entry);
    buckets.set(label, bucket);
  }

  const groups: GroupSummary[] = [];
  let belowFloor = 0;
  for (const [label, bucket] of buckets) {
    if (bucket.length < minSize) {
      belowFloor += bucket.length;
      continue;
    }
    const outcomes = splitOutcomes(bucket);
    groups.push({
      label,
      count: bucket.length,
      outcomes,
      passRate: documentPassRate(outcomes),
      topFindings: findingPatterns(bucket, options.findingLimit ?? 5),
    });
  }

  groups.sort((left, right) => right.count - left.count);
  return { groups, belowFloor, unlabelled };
}

/**
 * What the console is allowed to say out loud about a group.
 *
 * Written here rather than in the page so the hedging cannot drift: whoever
 * reads these numbers next month will be tempted to state them more firmly than
 * they deserve, and this is the sentence that stops that.
 */
export function describeConfidence(group: GroupSummary): string {
  const known = group.outcomes.passed + group.outcomes.failed;
  if (known === 0) return `${group.count}건 · 결과를 알려준 지원이 아직 없습니다. 경향으로 읽지 마세요.`;
  if (group.passRate === null) return `${group.count}건 중 결과 확인 ${known}건 · 표본이 적어 비율은 내지 않습니다.`;
  return `${group.count}건 중 결과 확인 ${known}건 · 자발적 응답이며 검증되지 않았습니다.`;
}
