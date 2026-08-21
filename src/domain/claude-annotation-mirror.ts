import { diffText } from "@/lib/text-diff";

export type ClaudeAnnotationType = "good" | "delete" | "vague" | "revise";

export const CLAUDE_ANNOTATION_LABEL: Record<ClaudeAnnotationType, string> = {
  good: "좋은 표현",
  delete: "삭제 추천",
  vague: "구체성 부족",
  revise: "수정 추천",
};

export type ClaudeAnnotationSegment = { key: string; value: string; type?: ClaudeAnnotationType };
export type ClaudeAnnotationCard = { key: string; phrase: string; type: ClaudeAnnotationType; comment: string };

function pushSegment(segments: ClaudeAnnotationSegment[], value: string, type?: ClaudeAnnotationType) {
  const last = segments[segments.length - 1];
  if (last && last.type === type) {
    last.value += value;
    return;
  }
  segments.push({ key: `seg-${segments.length}`, value, type });
}

/**
 * Best-effort fallback for results saved before the good/delete/vague/revise
 * classification existed (see docs/agent-change-log.md). It only surfaces facts
 * already true of the stored data — text actually removed in the real revision,
 * and text the analysis already flagged via highlightedPhrases — it does not
 * invent a "vague" or "revise" judgment the AI never made for this result.
 */
export function buildClaudeAnnotationMirror(
  originalAnswer: string,
  revisedAnswer: string,
  highlightedPhrases: readonly string[],
): { segments: ClaudeAnnotationSegment[]; cards: ClaudeAnnotationCard[] } {
  const parts = diffText(originalAnswer, revisedAnswer).filter((part) => part.type !== "added");
  const segments: ClaudeAnnotationSegment[] = [];
  const cards: ClaudeAnnotationCard[] = [];

  for (const part of parts) {
    if (part.type === "removed") {
      pushSegment(segments, part.value, "delete");
      const phrase = part.value.trim();
      if (phrase.length >= 2) cards.push({ key: `card-${cards.length}`, phrase, type: "delete", comment: "실제 첨삭에서 삭제된 표현입니다." });
      continue;
    }
    const trimmed = part.value.trim();
    const isFlagged = trimmed.length >= 4 && highlightedPhrases.some((phrase) => phrase.includes(trimmed));
    pushSegment(segments, part.value, isFlagged ? "good" : undefined);
    if (isFlagged) cards.push({ key: `card-${cards.length}`, phrase: trimmed, type: "good", comment: "분석이 강조한 표현으로, 원문 그대로 유지됐습니다." });
  }
  return { segments, cards };
}

export type SpanAnnotation = { start: number; end: number; type: ClaudeAnnotationType };

/** Slices `text` around already-resolved start/end spans (used by the sample data, which carries real span offsets). */
export function segmentsFromSpans<T extends SpanAnnotation>(text: string, spans: readonly T[]): ClaudeAnnotationSegment[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const segments: ClaudeAnnotationSegment[] = [];
  let cursor = 0;
  for (const span of sorted) {
    if (span.start < cursor) continue;
    if (span.start > cursor) pushSegment(segments, text.slice(cursor, span.start));
    pushSegment(segments, text.slice(span.start, span.end), span.type);
    cursor = span.end;
  }
  if (cursor < text.length) pushSegment(segments, text.slice(cursor));
  return segments;
}
