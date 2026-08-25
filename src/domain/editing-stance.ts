import { z } from "zod";

/**
 * How much risk the applicant wants the finished draft to carry.
 *
 * The premise this comes from: a cover letter has no correct answer, because a
 * person reads it. One reviewer rejects a draft for a typo, the next one hires
 * on the strength of the story and never notices. Nothing an editor does makes
 * every reviewer say yes.
 *
 * So the honest thing to sell is not a right answer. It is a choice the
 * applicant is entitled to make: round off the corners so that fewer reviewers
 * find a reason to mark you down, or keep the corners and be a strong fit for
 * the smaller number of companies that want exactly you. Both are real
 * strategies, and picking for them is what makes every AI-edited letter come
 * back sounding like the same person who values 협업·성장·도전.
 *
 * Deliberately a different axis from `WritingStyle` (담백/균형/강점), which is
 * about tone. This one is about tolerance for being marked down.
 */

export const editingStanceSchema = z.enum(["SAFE", "BALANCED", "CONVICTION"]);
export type EditingStance = z.infer<typeof editingStanceSchema>;

export const DEFAULT_EDITING_STANCE: EditingStance = "BALANCED";

export const editingStanceConfig = {
  SAFE: {
    icon: "🛡",
    label: "합격 안정형",
    summary: "감점 요인을 먼저 없앱니다.",
    description: "평가자의 개인적 취향 때문에 깎일 가능성을 최소화합니다. 서류에서 걸릴 모서리를 다듬는 쪽을 우선합니다.",
    points: [
      "논쟁적이거나 단정적인 표현 완화",
      "과장으로 읽힐 수 있는 문장 정리",
      "조직 적응에 물음표가 붙을 표현 수정",
      "면접에서 공격받을 문장 최소화",
    ],
  },
  BALANCED: {
    icon: "⚖️",
    label: "균형형",
    summary: "개성은 두고 위험한 곳만 다듬습니다.",
    description: "지원자의 말투와 가치관은 그대로 두고, 불필요하게 깎일 부분만 손봅니다. 대부분의 지원자에게 맞는 기본값입니다.",
    points: [
      "원래 말투와 가치관 보존",
      "강점은 강하게",
      "위험한 표현만 완화",
      "차별성과 안정성의 균형",
    ],
  },
  CONVICTION: {
    icon: "🔥",
    label: "소신 강조형",
    summary: "맞는 회사에 강하게 어필합니다.",
    description: "모든 회사에 무난하기보다 나와 맞는 회사에 분명하게 전달되도록 씁니다. 호불호가 갈릴 수 있다는 것을 알고 고르는 선택입니다.",
    points: [
      "지원자의 가치관 적극 보존",
      "독특한 경험과 관점 강조",
      "모범답안으로 평준화하지 않음",
      "합격 범위보다 회사와의 적합도 우선",
    ],
  },
} as const satisfies Record<EditingStance, {
  icon: string;
  label: string;
  summary: string;
  description: string;
  points: readonly string[];
}>;

export function getEditingStanceConfig(stance: EditingStance) {
  return editingStanceConfig[stance];
}

/**
 * What the model is told, per stance.
 *
 * BALANCED is not silent. Left unsaid, the model drifts toward the average
 * "good" cover letter on its own — which is the failure this whole setting
 * exists to name — so the middle option has to say out loud that the
 * applicant's own voice stays.
 */
export const EDITING_STANCE_INSTRUCTION: Record<EditingStance, string> = {
  SAFE: [
    "첨삭 방향: 합격 안정형. 이 지원자는 가능한 한 많은 평가자에게 걸리지 않는 지원서를 원합니다.",
    "감점 가능성이 있는 표현을 먼저 다듬으세요. 단정적인 평가, 논쟁이 될 수 있는 주장, 회사·업계·타인에 대한 단언, 조직 적응에 의문이 생길 표현, 과장으로 읽힐 수 있는 문장이 대상입니다.",
    "다만 '무난하게 만들기'가 '내용을 지우기'가 되어서는 안 됩니다. 지원자가 실제로 한 일과 그 근거는 그대로 두고, 그것을 서술하는 방식만 바꾸세요. 깎아내는 것은 모서리이지 경험이 아닙니다.",
  ].join("\n"),
  BALANCED: [
    "첨삭 방향: 균형형. 지원자의 말투와 가치관은 유지하고, 불필요하게 감점될 표현만 완화하세요.",
    "평범한 모범답안으로 수렴시키지 마세요. 협업·성장·도전 같은 일반적인 단어로 바꾸는 것은 개선이 아니라 지원자를 지우는 것입니다.",
  ].join("\n"),
  CONVICTION: [
    "첨삭 방향: 소신 강조형. 이 지원자는 모든 회사에 무난한 지원서보다, 자신과 맞는 회사에 분명히 전달되는 지원서를 원한다고 직접 선택했습니다.",
    "지원자 고유의 관점, 판단 기준, 독특한 경험을 살리세요. 호불호가 갈릴 수 있는 표현이라도 근거가 분명하면 유지하고, 근거를 더 또렷하게 만드는 쪽으로 고치세요.",
    "그래도 지켜야 할 선은 있습니다. 사실이 아닌 내용, 타인·회사·집단을 깎아내리는 표현, 확인되지 않은 수치는 소신이 아니라 위험입니다. 이런 것은 방향과 무관하게 고치세요.",
  ].join("\n"),
};

/**
 * What FINAL's Red Team pass does with what it finds.
 *
 * Without this the two features fight each other: the Red Team is told to find
 * every corner a reviewer could catch, and an applicant who deliberately chose
 * 소신 강조형 would get those corners filed off anyway — the setting would be a
 * lie. The stance decides the handling; the finding is reported either way, so
 * nobody keeps a corner without being told it is there.
 */
export const RED_TEAM_HANDLING_INSTRUCTION: Record<EditingStance, string> = {
  SAFE: "rejectionRisks에서 찾은 것은 첨삭본에서 적극적으로 없애거나 완화하세요. 지원자가 합격 안정형을 골랐으므로 감점 요인 제거가 우선입니다. 다만 표현만 다듬고 지원자가 실제로 한 일은 남기세요.",
  BALANCED: "rejectionRisks 중 severity가 high인 것은 첨삭본에서 완화하고, medium·low는 지원자의 표현을 살린 채 목록으로만 알리세요.",
  // The one that would be silently overridden without an explicit instruction.
  CONVICTION: "rejectionRisks는 찾아서 알리되, 지원자가 소신 강조형을 골랐으므로 그 사람의 관점과 개성이 담긴 표현은 첨삭본에서 임의로 지우지 마세요. handling에 kept_by_choice로 표시하고, 어떤 위험이 있는지는 분명히 적으세요. 사실이 아니거나 타인을 깎아내리는 표현은 방향과 무관하게 고칩니다.",
};

/**
 * The stance is a PRO-and-above control.
 *
 * QUICK is sold as "fix what is already written" and has neither the posting
 * nor the materials to judge what is safe to keep, so offering the choice there
 * would be offering a lever that is not connected to anything.
 */
export function canChooseEditingStance(product: "QUICK" | "PRO" | "FINAL"): boolean {
  return product === "PRO" || product === "FINAL";
}

export function resolveEditingStance(
  product: "QUICK" | "PRO" | "FINAL",
  requested: EditingStance | undefined,
): EditingStance {
  if (!canChooseEditingStance(product)) return DEFAULT_EDITING_STANCE;
  return requested ?? DEFAULT_EDITING_STANCE;
}
