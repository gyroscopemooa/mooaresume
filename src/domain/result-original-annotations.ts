import { diffText } from "@/lib/text-diff";
import type { ResultOriginalAnnotation, ResultQuestion } from "@/domain/result-document";

export type OriginalAnnotationDraft = Pick<ResultOriginalAnnotation, "phrase" | "type" | "comment"> & {
  // The model returns null when there is nothing to rewrite (good, fact); the
  // stored document simply omits the field in that case.
  suggestion?: string | null;
};

export function resolveOriginalAnnotations(
  originalAnswer: string,
  drafts: readonly OriginalAnnotationDraft[],
  idPrefix: string,
): ResultOriginalAnnotation[] {
  return drafts.flatMap((draft, index) => {
    const start = originalAnswer.indexOf(draft.phrase);
    if (start < 0 || originalAnswer.indexOf(draft.phrase, start + draft.phrase.length) >= 0) return [];
    const { suggestion, ...rest } = draft;
    const trimmed = suggestion?.trim();
    return [{
      ...rest,
      ...(trimmed ? { suggestion: trimmed } : {}),
      id: `${idPrefix}-${index + 1}`,
      start,
      end: start + draft.phrase.length,
    }];
  });
}

function trimmedSpan(value: string, offset: number) {
  const leading = value.length - value.trimStart().length;
  const phrase = value.trim();
  if (phrase.replace(/\s/g, "").length < 4 || !/[\p{L}\p{N}]/u.test(phrase)) return null;
  return { phrase, start: offset + leading, end: offset + leading + phrase.length };
}

/**
 * Results saved before originalAnnotations existed still contain the exact
 * original and revised answers. Mark only objectively changed source spans;
 * do not invent semantic "good" or "vague" judgments after the paid run.
 */
export function deriveFallbackOriginalAnnotations(
  question: Pick<ResultQuestion, "id" | "originalAnswer" | "revisedAnswer" | "originalAnnotations">,
): ResultOriginalAnnotation[] {
  if (question.originalAnnotations?.length) return question.originalAnnotations;

  const annotations: ResultOriginalAnnotation[] = [];
  let originalOffset = 0;
  for (const part of diffText(question.originalAnswer, question.revisedAnswer)) {
    if (part.type === "added") continue;
    if (part.type === "removed") {
      const span = trimmedSpan(part.value, originalOffset);
      if (span) {
        annotations.push({
          id: `${question.id}-fallback-${annotations.length + 1}`,
          ...span,
          type: "revise",
          comment: "기존 분석의 첨삭본에서 변경된 원문 구간입니다. 구체적인 이유는 문항별 첨삭의 수정 이유에서 확인하세요.",
        });
      }
    }
    originalOffset += part.value.length;
    if (annotations.length >= 8) break;
  }
  return annotations;
}
