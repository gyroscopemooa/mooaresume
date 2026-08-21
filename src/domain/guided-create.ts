import { z } from "zod";
import { createCoverLetterQuestion, type CoverLetterQuestion } from "@/domain/cover-letter-question";

/**
 * "아직 아무것도 못 썼어요" cannot be served by the ordinary analysis: with no
 * draft there is nothing to revise, and asking a model to invent one produces
 * exactly the fabricated experience this product refuses to ship.
 *
 * So the facts are collected from the applicant first, one question at a time,
 * with no AI involved. The collected notes become the source text for the
 * single analysis that already exists — no extra model calls, no new pricing.
 */

export const guidedExperienceSchema = z.object({
  // Defaulted so drafts saved before categories existed still parse.
  category: z.string().max(40).default(""),
  where: z.string().max(200).default(""),
  situation: z.string().max(1500).default(""),
  action: z.string().max(1500).default(""),
  result: z.string().max(1500).default(""),
});
export type GuidedExperience = z.infer<typeof guidedExperienceSchema>;

export const guidedBlockIdSchema = z.enum(["motivation", "aspiration", "experienceOne", "experienceTwo", "strength", "goal"]);
export type GuidedBlockId = z.infer<typeof guidedBlockIdSchema>;

export const guidedCreateDraftSchema = z.object({
  motivation: z.string().max(1500).default(""),
  aspiration: z.string().max(1500).default(""),
  experienceOne: guidedExperienceSchema.default({ category: "", where: "", situation: "", action: "", result: "" }),
  experienceTwo: guidedExperienceSchema.default({ category: "", where: "", situation: "", action: "", result: "" }),
  strength: z.string().max(1500).default(""),
  goal: z.string().max(1500).default(""),
  assignments: z.record(z.string(), z.array(guidedBlockIdSchema)).default({}),
});
export type GuidedCreateDraft = z.infer<typeof guidedCreateDraftSchema>;

export function createGuidedCreateDraft(): GuidedCreateDraft {
  return guidedCreateDraftSchema.parse({});
}

/**
 * Asking someone who cannot write a cover letter to name "your best
 * experience" hands them the same blank page they came here to escape. The
 * list below is the one the PRO input screen already offers; picking from it
 * is a much easier first move than recalling one unprompted.
 */
export const GUIDED_EXPERIENCE_CATEGORIES = [
  "경력·인턴", "아르바이트", "프로젝트", "학교·전공", "동아리·학생회",
  "공모전·수상", "교육·부트캠프", "해외 경험", "봉사활동", "군 복무",
  "개인·사이드 프로젝트", "연구·논문", "취미에서 얻은 경험", "기타 경험",
] as const;

export const GUIDED_BLOCK_LABEL: Record<GuidedBlockId, string> = {
  motivation: "지원 계기",
  aspiration: "하고 싶은 일",
  experienceOne: "경험 ①",
  experienceTwo: "경험 ②",
  strength: "강점과 일하는 방식",
  goal: "입사 후 목표",
};

export type GuidedField =
  | { kind: "text"; path: "motivation" | "aspiration" | "strength" | "goal"; label: string; placeholder: string; rows: number }
  | { kind: "experience"; path: "experienceOne" | "experienceTwo"; field: keyof GuidedExperience; label: string; placeholder: string; rows: number };

export type GuidedStep = { id: string; title: string; help: string; optional?: boolean; fields: GuidedField[] };

/**
 * Ten steps, asked in order. Each one asks for a fact the applicant already
 * knows — never for a finished sentence, which is the part they came here
 * because they could not write.
 */
export const GUIDED_STEPS: GuidedStep[] = [
  {
    id: "questions",
    title: "먼저, 자기소개서 문항을 알려 주세요.",
    help: "회사가 준 질문을 그대로 적어 주세요. 어떤 문항인지 알아야 어떤 경험을 여쭤볼지 정할 수 있습니다.",
    fields: [],
  },
  {
    id: "motivation",
    title: "이 회사·직무에 관심을 갖게 된 계기가 무엇인가요?",
    help: "멋진 문장이 아니어도 됩니다. 계기가 된 수업, 경험, 뉴스, 사람처럼 실제로 있었던 일을 그대로 적어 주세요.",
    fields: [{ kind: "text", path: "motivation", label: "계기", placeholder: "예: 현장실습에서 안전관리자가 하는 일을 처음 보고 관심이 생겼습니다.", rows: 4 }],
  },
  {
    id: "aspiration",
    title: "그 직무에서 실제로 하고 싶은 일은 무엇인가요?",
    help: "아는 만큼만 적어 주세요. 잘 모르면 아직 잘 모르지만 무엇을 해보고 싶다고 적어도 괜찮습니다.",
    fields: [{ kind: "text", path: "aspiration", label: "하고 싶은 일", placeholder: "예: 현장 점검 기준을 정리하고 작업자와 공유하는 일을 해보고 싶습니다.", rows: 4 }],
  },
  {
    id: "experienceOne-where",
    title: "가장 자신 있는 경험 하나를 골라 주세요. 언제, 어디서 한 일인가요?",
    help: "소속과 기간, 맡은 역할을 적어 주세요. 동아리·아르바이트·수업 과제도 좋은 소재가 됩니다.",
    fields: [{ kind: "experience", path: "experienceOne", field: "where", label: "소속 · 기간 · 역할", placeholder: "예: 롯데테크 현장실습 · 2025.03~2025.08 · 안전관리 보조", rows: 2 }],
  },
  {
    id: "experienceOne-situation",
    // "무슨 문제가 있었나요"만 물으면 문제 해결형이 아닌 경험에서 없는 문제를
    // 지어내게 된다. 꾸준히 한 것, 처음 배운 것, 설득한 것도 좋은 소재다.
    title: "그때 무엇이 어려웠거나, 무엇을 새로 해야 했나요?",
    help: "꼭 대단한 문제가 아니어도 됩니다. 처음 해보는 일이었거나, 손이 많이 갔거나, 사람을 설득해야 했던 것도 좋습니다.",
    fields: [{ kind: "experience", path: "experienceOne", field: "situation", label: "어려웠던 점 · 새로 해야 했던 일", placeholder: "예: 같은 공정에서 같은 형태의 불량이 반복되는데 원인을 아무도 몰랐습니다.", rows: 4 }],
  },
  {
    id: "experienceOne-action",
    title: "그 상황에서 본인이 실제로 한 행동은 무엇인가요?",
    help: "팀이 한 일 말고 본인이 한 일을 적어 주세요. 작은 일도 괜찮습니다.",
    fields: [{ kind: "experience", path: "experienceOne", field: "action", label: "내가 한 행동", placeholder: "예: 검사 기준서와 실제 작업 순서를 단계별로 직접 대조했습니다.", rows: 4 }],
  },
  {
    id: "experienceOne-result",
    title: "그래서 어떻게 됐고, 무엇을 배웠나요?",
    help: "숫자가 없으면 없는 대로 적어 주세요. 없는 수치는 만들지 않습니다.",
    fields: [{ kind: "experience", path: "experienceOne", field: "result", label: "결과와 배운 점", placeholder: "예: 점검 순서를 통일해 시험했고, 기준이 사람마다 다르면 문제가 반복된다는 걸 배웠습니다.", rows: 4 }],
  },
  {
    id: "experienceTwo",
    title: "두 번째 경험이 있다면 알려 주세요.",
    help: "문항이 여러 개면 서로 다른 경험을 쓰는 편이 좋습니다. 없으면 건너뛰어도 됩니다.",
    optional: true,
    fields: [
      { kind: "experience", path: "experienceTwo", field: "where", label: "소속 · 기간 · 역할", placeholder: "예: 교내 안전동아리 · 2024 · 총무", rows: 2 },
      { kind: "experience", path: "experienceTwo", field: "situation", label: "상황과 과제", placeholder: "무엇이 문제였나요?", rows: 3 },
      { kind: "experience", path: "experienceTwo", field: "action", label: "내가 한 행동", placeholder: "본인이 한 일을 적어 주세요.", rows: 3 },
      { kind: "experience", path: "experienceTwo", field: "result", label: "결과와 배운 점", placeholder: "결과와 배운 점을 적어 주세요.", rows: 3 },
    ],
  },
  {
    id: "strength",
    title: "본인의 강점과 일하는 방식은 어떤가요?",
    help: "성실하다는 말보다, 그렇게 생각하는 근거가 된 장면을 함께 적어 주세요.",
    fields: [{ kind: "text", path: "strength", label: "강점과 일하는 방식", placeholder: "예: 모르는 건 바로 물어보는 편입니다. 실습 때 매일 작업자에게 확인하고 기록했습니다.", rows: 4 }],
  },
  {
    id: "goal",
    title: "입사 후 하고 싶은 일이나 목표가 있나요?",
    help: "회사에 대해 확실히 아는 내용만 적어 주세요. 모르는 사업 내용은 적지 않는 편이 안전합니다.",
    optional: true,
    fields: [{ kind: "text", path: "goal", label: "입사 후 목표", placeholder: "예: 먼저 현장 점검 기준을 익히고, 반복되는 위험을 기록으로 남기는 사람이 되고 싶습니다.", rows: 4 }],
  },
  {
    id: "assign",
    title: "각 문항에 어떤 내용을 쓸지 골라 주세요.",
    help: "문항마다 어울리는 소재를 고르면, 입력한 사실만으로 문항별 초안을 만듭니다.",
    fields: [],
  },
];

function experienceText(experience: GuidedExperience) {
  return [
    experience.category.trim() && `경험 종류: ${experience.category.trim()}`,
    experience.where.trim() && `소속·기간·역할: ${experience.where.trim()}`,
    experience.situation.trim() && `상황과 과제: ${experience.situation.trim()}`,
    experience.action.trim() && `내가 한 행동: ${experience.action.trim()}`,
    experience.result.trim() && `결과와 배운 점: ${experience.result.trim()}`,
  ].filter(Boolean).join("\n");
}

export function guidedBlockText(draft: GuidedCreateDraft, block: GuidedBlockId): string {
  if (block === "experienceOne") return experienceText(draft.experienceOne);
  if (block === "experienceTwo") return experienceText(draft.experienceTwo);
  return draft[block].trim();
}

export function hasGuidedBlock(draft: GuidedCreateDraft, block: GuidedBlockId) {
  return guidedBlockText(draft, block).length > 0;
}

export function availableGuidedBlocks(draft: GuidedCreateDraft): GuidedBlockId[] {
  return guidedBlockIdSchema.options.filter((block) => hasGuidedBlock(draft, block));
}

/**
 * Builds the source text for one question out of the blocks assigned to it.
 * The result is labelled as notes, not prose: the analysis is told to write the
 * answer from these facts rather than to lightly edit them.
 */
export function composeGuidedAnswer(draft: GuidedCreateDraft, blocks: readonly GuidedBlockId[]): string {
  return blocks
    .filter((block) => hasGuidedBlock(draft, block))
    .map((block) => `[${GUIDED_BLOCK_LABEL[block]}]\n${guidedBlockText(draft, block)}`)
    .join("\n\n");
}

/** Applies every assignment to the question list handed to the analysis. */
export function applyGuidedAnswers(
  draft: GuidedCreateDraft,
  questions: readonly CoverLetterQuestion[],
): CoverLetterQuestion[] {
  return questions.map((question) => ({
    ...question,
    answer: composeGuidedAnswer(draft, draft.assignments[question.id] ?? []),
  }));
}

export function createGuidedQuestion(prompt = ""): CoverLetterQuestion {
  return { ...createCoverLetterQuestion(), prompt };
}
