import {
  confirmationSchema,
  slotAnswerSchema,
  supplementsSchema,
  type ConflictConfirmation,
  type FinalHints,
  type MaterialDoc,
  type MaterialsPayload,
  type PackAssessment,
  type PackDocKind,
  type PackSlotAnswer,
  type PackSupplements,
} from "@/domain/interview-pack";
import { sanitizeUserText } from "@/domain/interview-pack-text";
import { z } from "zod";

/**
 * 면접 준비팩 자료 버전을 만드는 순수 함수들.
 *
 * 1번 버전은 FINAL 건에서 읽어 온 원본 스냅샷(문서 전문)이고, 이후 버전은 사용자가 보완한 내용만 담는다.
 * 원본 FINAL 자료와 첨삭 결과는 어느 단계에서도 고치지 않는다.
 */

/** 사실 근거로 더 중요한 자료부터 읽히도록 하는 순서(길이 제한에 걸릴 때 뒤쪽이 잘린다). */
const KIND_PRIORITY: Record<PackDocKind, number> = {
  job_posting: 0,
  resume: 1,
  cover_letter: 2,
  experience: 3,
  note: 4,
  certificate: 5,
  other: 6,
  supplement: 7,
};

export const MAX_DOCS = 12;
export const MAX_CHARS_PER_DOC = 12_000;
export const MAX_TOTAL_CHARS = 48_000;

/** 문서를 중요도순으로 세우고, 문서당·전체 글자 수를 제한한다. 잘린 문서에는 truncated 표시를 남긴다. */
export function capMaterialDocs(docs: readonly MaterialDoc[]): MaterialDoc[] {
  const ordered = [...docs]
    .filter((doc) => doc.text.trim().length > 0)
    .sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind])
    .slice(0, MAX_DOCS);

  let remaining = MAX_TOTAL_CHARS;
  const result: MaterialDoc[] = [];
  for (const [index, doc] of ordered.entries()) {
    if (remaining <= 0) break;
    const limit = Math.min(MAX_CHARS_PER_DOC, remaining);
    const text = doc.text.trim();
    const cut = text.length > limit;
    result.push({ ...doc, id: `D${index + 1}`, text: cut ? text.slice(0, limit) : text, truncated: cut || doc.truncated });
    remaining -= Math.min(text.length, limit);
  }
  return result;
}

/** 1번 자료 버전(원본 스냅샷). */
export function buildBaseMaterials(input: { docs: readonly MaterialDoc[]; company: string; role: string; hints: FinalHints }): MaterialsPayload {
  return {
    schema: 1,
    baseVersion: null,
    documents: capMaterialDocs(input.docs),
    hints: input.hints,
    base: { company: input.company.trim().slice(0, 120), role: input.role.trim().slice(0, 120) },
    supplements: {},
    slotAnswers: [],
    confirmations: [],
  };
}

/** 사용자가 보내는 보완 입력. 서버가 다시 검증·정리한다. */
export const supplementInputSchema = z.object({
  supplements: supplementsSchema.default({}),
  slotAnswers: z.array(slotAnswerSchema).max(40).default([]),
  confirmations: z.array(confirmationSchema.pick({ conflictId: true, choice: true, customText: true })).max(20).default([]),
});
export type SupplementInput = z.infer<typeof supplementInputSchema>;

function clean(value: string | undefined, max: number): string | undefined {
  if (value === undefined) return undefined;
  const cleaned = sanitizeUserText(value, max);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function cleanSupplements(input: PackSupplements): PackSupplements {
  return {
    company: clean(input.company, 120),
    role: clean(input.role, 120),
    jobPostingText: clean(input.jobPostingText, 8_000),
    emphasis: clean(input.emphasis, 1_500),
    applyReason: clean(input.applyReason, 1_500),
    contribution: clean(input.contribution, 1_500),
    exclude: clean(input.exclude, 1_000),
  };
}

export type ConfirmationResult =
  | { ok: true; confirmations: ConflictConfirmation[] }
  | { ok: false; reason: "UNKNOWN_CONFLICT" | "CUSTOM_TEXT_REQUIRED"; conflictId: string };

/**
 * 충돌 확인을 저장할 형태로 만든다. 어느 쪽이 맞다는 "내용"은 클라이언트가 보낸 문구가 아니라
 * 서버가 가진 점검 결과의 원문(left/right)에서 가져온다.
 */
export function resolveConfirmations(
  inputs: ReadonlyArray<Pick<ConflictConfirmation, "conflictId" | "choice" | "customText">>,
  assessment: PackAssessment | null,
): ConfirmationResult {
  const resolved: ConflictConfirmation[] = [];
  for (const input of inputs) {
    const conflict = assessment?.conflicts.find((entry) => entry.id === input.conflictId);
    if (!conflict) return { ok: false, reason: "UNKNOWN_CONFLICT", conflictId: input.conflictId };
    const customText = clean(input.customText, 600);
    if (input.choice === "custom" && !customText) return { ok: false, reason: "CUSTOM_TEXT_REQUIRED", conflictId: input.conflictId };

    const left = conflict.left.paragraphText;
    const right = conflict.right.paragraphText;
    const chosenText = input.choice === "left" ? left : input.choice === "right" ? right : (customText as string);
    const rejectedText = input.choice === "left" ? right : input.choice === "right" ? left : `${left}\n${right}`;
    resolved.push({
      conflictId: input.conflictId,
      choice: input.choice,
      ...(customText ? { customText } : {}),
      topic: conflict.topic,
      chosenText: chosenText.slice(0, 700),
      rejectedText: rejectedText.slice(0, 1_400),
    });
  }
  return { ok: true, confirmations: resolved };
}

/**
 * 새 자료 버전의 내용. 이전 버전 위에 사용자가 보완한 값만 덮는다(빈 값은 이전 값을 지우지 않는다).
 * 문항 보완 답변은 같은 (문항, 질문) 쌍이면 새 답이 이전 답을 대체한다.
 */
export function buildNextMaterialsPayload(input: {
  previous: MaterialsPayload;
  supplements: PackSupplements;
  slotAnswers: readonly PackSlotAnswer[];
  confirmations: readonly ConflictConfirmation[];
}): MaterialsPayload {
  const cleaned = cleanSupplements(input.supplements);
  const merged: PackSupplements = { ...input.previous.supplements };
  for (const [key, value] of Object.entries(cleaned) as Array<[keyof PackSupplements, string | undefined]>) {
    if (value !== undefined) merged[key] = value;
  }

  const answers = new Map<string, PackSlotAnswer>();
  for (const answer of input.previous.slotAnswers) answers.set(`${answer.slot}::${answer.question}`, answer);
  for (const answer of input.slotAnswers) {
    const question = sanitizeUserText(answer.question, 200);
    const text = sanitizeUserText(answer.answer, 1_200);
    if (question && text) answers.set(`${answer.slot}::${question}`, { slot: answer.slot, question, answer: text });
  }

  const confirmations = new Map<string, ConflictConfirmation>();
  for (const confirmation of input.previous.confirmations) confirmations.set(confirmation.conflictId, confirmation);
  for (const confirmation of input.confirmations) confirmations.set(confirmation.conflictId, confirmation);

  return {
    schema: 1,
    baseVersion: 1,
    supplements: merged,
    slotAnswers: [...answers.values()].slice(0, 40),
    confirmations: [...confirmations.values()].slice(0, 20),
  };
}
