import type {
  ResultAnswerStructure,
  ResultDocument,
} from "./result-document";

/**
 * FINAL's headline, computed here rather than asked for.
 *
 * The result screen needs one line at the top that answers "so where do I
 * stand". A score would do it, and a score is exactly what this product must
 * not print: we do not predict outcomes, and 84/100 is a number nobody can
 * check. What we can count honestly is how many things this run found that a
 * reviewer could stop on — and that number goes down as the applicant fixes
 * them and runs again, which is the whole experience.
 *
 * The wording matters as much as the number. "서류에서 걸릴 지점 4곳" claims we
 * know every reason an application gets rejected. "확인된 주요 서류 위험요소
 * 4곳" claims only what is true: these are the ones this run found.
 */

export type FinalVerdictItem = {
  /** Which section of the result it came from, so the screen can link there. */
  source: "conflict" | "rejection" | "interviewer" | "claim";
  headline: string;
  severity: "high" | "medium";
};

export type FinalVerdict = {
  count: number;
  label: string;
  items: FinalVerdictItem[];
};

/** Below this the finding is worth listing but not worth counting as a risk. */
function isCounted(severity: "high" | "medium" | "low"): severity is "high" | "medium" {
  return severity === "high" || severity === "medium";
}

export function computeFinalVerdict(
  result: Pick<ResultDocument, "documentConflicts" | "rejectionRisks" | "interviewerFlags" | "claimEvidence">,
): FinalVerdict {
  const items: FinalVerdictItem[] = [
    ...result.documentConflicts
      .filter((conflict) => isCounted(conflict.severity))
      .map((conflict): FinalVerdictItem => ({ source: "conflict", headline: conflict.conflict, severity: conflict.severity as "high" | "medium" })),
    // Something the applicant deliberately kept is not an unresolved risk. It
    // is still shown in its own section — counting it would nag them for a
    // decision they already made on purpose.
    ...result.rejectionRisks
      .filter((risk) => isCounted(risk.severity) && risk.handling !== "removed" && risk.handling !== "kept_by_choice")
      .map((risk): FinalVerdictItem => ({ source: "rejection", headline: risk.headline, severity: risk.severity as "high" | "medium" })),
    ...result.interviewerFlags
      .filter((flag) => flag.likelihood === "high" || flag.likelihood === "medium")
      .map((flag): FinalVerdictItem => ({ source: "interviewer", headline: flag.headline, severity: flag.likelihood === "high" ? "high" : "medium" })),
    // A claim with nothing behind it is the one a reviewer asks about first.
    // "weak" is not counted: it has evidence, just not enough of it.
    ...result.claimEvidence
      .filter((claim) => claim.verdict === "unsupported")
      .map((claim): FinalVerdictItem => ({ source: "claim", headline: `근거가 확인되지 않은 주장: ${claim.claim}`, severity: "high" })),
  ];

  items.sort((left, right) => (left.severity === right.severity ? 0 : left.severity === "high" ? -1 : 1));

  return {
    count: items.length,
    label: items.length === 0
      ? "확인된 주요 서류 위험요소가 없습니다."
      : `FINAL에서 확인된 주요 서류 위험요소 ${items.length}곳`,
    items,
  };
}

/**
 * The X-Ray numbers.
 *
 * The model classified the sentences; this counts them. Keeping the two apart
 * is the whole point — a model asked for "상황 15% / 행동 45%" writes numbers
 * that look measured and are not, while a model asked "which sentences are
 * about what you did" is doing the thing it is actually good at. Every figure
 * on screen is derived here, from sentences the applicant can read back.
 */
export type AnswerStructureCount = {
  questionOrder: number;
  situation: { sentences: number; characters: number };
  action: { sentences: number; characters: number };
  result: { sentences: number; characters: number };
  jobLink: { sentences: number; characters: number };
  totalSentences: number;
  /** True when background outweighs what the applicant actually did. */
  actionThin: boolean;
  reading: string;
};

function measure(sentences: readonly string[]) {
  return {
    sentences: sentences.length,
    characters: sentences.reduce((sum, sentence) => sum + sentence.replace(/\s/g, "").length, 0),
  };
}

export function countAnswerStructure(structure: ResultAnswerStructure): AnswerStructureCount {
  const situation = measure(structure.situation);
  const action = measure(structure.action);
  const result = measure(structure.result);
  const jobLink = measure(structure.jobLink);

  return {
    questionOrder: structure.questionOrder,
    situation,
    action,
    result,
    jobLink,
    totalSentences: situation.sentences + action.sentences + result.sentences + jobLink.sentences,
    // Compared by characters, not sentence count: one long background paragraph
    // and one short "제가 했습니다" is the imbalance being looked for, and by
    // sentence count that reads as even.
    actionThin: action.characters > 0 && situation.characters > action.characters * 1.5,
    reading: structure.reading,
  };
}
