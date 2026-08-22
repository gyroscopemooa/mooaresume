import { z } from "zod";
import { splitCoverLetterDraft } from "./cover-letter-parser";

export const writingModeSchema = z.enum(["CREATE", "BUILD", "POLISH"]);
export type WritingMode = z.infer<typeof writingModeSchema>;

export const issueTagSchema = z.enum([
  "missing_evidence",
  "missing_result",
  "weak_job_connection",
  "generic_motivation",
  "insufficient_personal_role",
  "duplicate_experience",
  "length_under",
  "length_over",
  "cross_document_conflict",
  "company_specificity_low",
  "needs_verification",
]);
export type IssueTag = z.infer<typeof issueTagSchema>;

export const writingModeDecisionSchema = z.object({
  mode: writingModeSchema,
  confidence: z.enum(["low", "medium", "high"]),
  reasons: z.array(z.string().min(1)).min(1),
  userMessage: z.string().min(1),
  canOverride: z.literal(true),
});
export type WritingModeDecision = z.infer<typeof writingModeDecisionSchema>;

export type WritingModeInput = {
  draft: string;
  targetLength?: number;
  hasJobPosting: boolean;
};

const compactLength = (value: string) => value.replace(/\s/g, "").length;

const incompleteMemoPattern = /(작성\s*(가능|필요|예정|추가)|추후\s*작성|내용\s*필요|보완\s*필요|주특기\s*업무작성)/i;

function findIncompleteQuestionNumbers(draft: string): number[] {
  const matches = [...draft.matchAll(/^\s*(\d+)\.\s*[^\n]*/gm)];
  return matches.flatMap((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? draft.length;
    const answer = draft.slice(start, end).trim();
    return compactLength(answer) < 30 || incompleteMemoPattern.test(answer) ? [Number(match[1])] : [];
  });
}

/**
 * How many answered questions the pasted draft holds. Used to judge fill on a
 * per-question basis rather than by total volume.
 */
function countDraftQuestions(draft: string) {
  return splitCoverLetterDraft(draft).filter((question) => question.answer.trim()).length;
}

export function decideWritingMode(input: WritingModeInput): WritingModeDecision {
  const draft = input.draft.trim();
  const length = compactLength(draft);

  if (length === 0) {
    return {
      mode: "CREATE",
      confidence: "high",
      reasons: [input.hasJobPosting ? "작성된 지원서가 없고 채용공고만 있습니다." : "작성된 지원서가 없습니다."],
      userMessage: "처음부터 작성 단계로 판단했어요. 경험을 먼저 확인한 뒤 소재와 개요를 함께 만들어요.",
      canOverride: true,
    };
  }

  const incompleteQuestions = findIncompleteQuestionNumbers(draft);
  const hasIncompleteMemo = incompleteMemoPattern.test(draft);
  if (incompleteQuestions.length > 0 || hasIncompleteMemo) {
    const reasons = [];
    if (incompleteQuestions.length > 0) reasons.push(`${incompleteQuestions.join(", ")}번 문항이 비어 있거나 작성 메모 상태입니다.`);
    if (hasIncompleteMemo) reasons.push("본문에 추가 작성 또는 보완이 필요한 메모가 남아 있습니다.");
    return {
      mode: "BUILD",
      confidence: "high",
      reasons,
      userMessage: "내용 보완 단계로 판단했어요. 비어 있는 문항과 작성 메모를 먼저 완성한 뒤 최종 첨삭을 진행해요.",
      canOverride: true,
    };
  }

  const target = input.targetLength;
  /*
   * Per question, not per draft.
   *
   * The ratio used to divide the whole pasted draft by a single question's
   * target, so three answers of 450 characters against a 700-character limit
   * scored 193% and were called finished — when each one is at 64%. The more
   * questions someone pasted, the more certain POLISH became, regardless of
   * how thin any individual answer was. That is how a draft needing BUILD ends
   * up polished instead, and polishing does not lengthen anything.
   */
  const questionCount = Math.max(countDraftQuestions(draft), 1);
  const perQuestionLength = length / questionCount;
  const fillRatio = target && target > 0 ? perQuestionLength / target : undefined;
  // The absolute floor is per question too. It used to be an OR against the
  // whole draft, which let any multi-question paste clear it on volume alone.
  const looksSubstantial = fillRatio !== undefined
    ? fillRatio >= 0.78
    : perQuestionLength >= 450;

  if (!looksSubstantial) {
    const reason = fillRatio !== undefined
      ? `목표 분량의 ${Math.round(fillRatio * 100)}%가 작성되어 있어 내용과 근거 보완이 우선입니다.`
      : "초안이 짧아 표현보다 내용과 근거 보완이 우선입니다.";
    return {
      mode: "BUILD",
      confidence: fillRatio === undefined ? "medium" : "high",
      reasons: [reason],
      userMessage: "내용 보완 단계로 판단했어요. 부족한 경험과 근거를 질문한 뒤 기존 초안을 발전시켜요.",
      canOverride: true,
    };
  }

  return {
    mode: "POLISH",
    confidence: fillRatio === undefined ? "medium" : "high",
    reasons: [fillRatio !== undefined ? `목표 분량의 ${Math.round(fillRatio * 100)}%가 작성되어 있습니다.` : "검토 가능한 분량의 초안이 작성되어 있습니다."],
    userMessage: "최종 첨삭 단계로 판단했어요. 원래 표현을 살리면서 제출 전 오류와 적합성을 점검해요.",
    canOverride: true,
  };
}
