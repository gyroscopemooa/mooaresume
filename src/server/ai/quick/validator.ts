import type { CoverLetterQuestion } from "@/domain/cover-letter-question";
import type { QuickAnalysisOutput } from "./schema";

export type QuickValidationIssue = { code: "NEW_NUMBER" | "INVALID_EVIDENCE" | "INVALID_HIGHLIGHT" | "LENGTH_OVER" | "QUESTION_MISMATCH"; message: string };
const compactLength = (value: string) => value.replace(/\s/g, "").length;
const numericTokens = (value: string) => new Set(value.match(/\d+(?:[.,]\d+)?%?/g) ?? []);
const normalizeEvidence = (value: string) => value.replace(/\s+/g, " ").trim();
const compactEvidence = (value: string) => normalizeEvidence(value).replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
function evidenceMatchesSource(source: string, quote: string) {
  const compactSource = compactEvidence(source);
  const compactQuote = compactEvidence(quote);
  if (!compactQuote || compactSource.includes(compactQuote)) return Boolean(compactQuote);
  const tokens = normalizeEvidence(quote).split(" ").map(compactEvidence).filter((token) => token.length >= 2);
  if (tokens.length < 2) return false;
  const matched = tokens.filter((token) => compactSource.includes(token)).length;
  return matched / tokens.length >= 0.7;
}
type QuickQuestion = CoverLetterQuestion & { order: number; targetLength: number };

export function validateQuickAnalysis(questions: QuickQuestion[], output: QuickAnalysisOutput): QuickValidationIssue[];
export function validateQuickAnalysis(original: string, output: QuickAnalysisOutput, targetLength: number): QuickValidationIssue[];
export function validateQuickAnalysis(input: QuickQuestion[] | string, output: QuickAnalysisOutput, targetLength?: number): QuickValidationIssue[] {
  const questions: QuickQuestion[] = typeof input === "string" ? [{ id: "legacy", title: "", prompt: "", answer: input, order: 1, targetLength: targetLength ?? 700 }] : input;
  const issues: QuickValidationIssue[] = [];
  const sourceText = questions.map((question) => question.answer).join("\n");
  const normalizedSource = normalizeEvidence(sourceText);
  for (const priority of output.priorities) if (!evidenceMatchesSource(normalizedSource, priority.evidenceQuote)) issues.push({ code: "INVALID_EVIDENCE", message: `우선순위의 근거가 원문에서 확인되지 않습니다: "${priority.evidenceQuote}"` });
  const revisionList = output.revisions ?? (output.revision ? [{ ...output.revision, questionOrder: 1 }] : []);
  const revisions = new Map(revisionList.map((revision) => [revision.questionOrder, revision]));
  if (revisions.size !== questions.length || questions.some((question) => !revisions.has(question.order))) issues.push({ code: "QUESTION_MISMATCH", message: "입력한 모든 문항의 첨삭 결과가 필요합니다." });
  for (const question of questions) {
    const revision = revisions.get(question.order); if (!revision) continue;
    const normalizedOriginal = normalizeEvidence(question.answer); const sourceNumbers = numericTokens(question.answer);
    for (const number of numericTokens(revision.revisedAnswer)) if (!sourceNumbers.has(number)) issues.push({ code: "NEW_NUMBER", message: `문항 ${question.order} 원문에 없는 수치 "${number}"가 첨삭본에 추가되었습니다.` });
    for (const reason of revision.reasons) if (!evidenceMatchesSource(normalizedOriginal, reason.evidenceQuote)) issues.push({ code: "INVALID_EVIDENCE", message: `문항 ${question.order} 수정 이유의 근거가 원문에서 확인되지 않습니다: "${reason.evidenceQuote}"` });
    // highlightedPhrases: deprecated, 미사용 필드 — 신규 원문 피드백은 originalAnnotations 참고. 여기서 검증하지 않는다(과거 결제 후 실패 버그의 원인이었음).
    if (compactLength(revision.revisedAnswer) > Math.ceil(Math.max(question.targetLength, compactLength(question.answer)) * 1.15)) issues.push({ code: "LENGTH_OVER", message: `문항 ${question.order} 첨삭본이 목표 글자 수의 허용 범위를 초과했습니다.` });
  }
  return issues;
}
export class QuickAnalysisValidationError extends Error { constructor(public readonly issues: QuickValidationIssue[]) { super(issues.map((issue) => issue.message).join("\n")); this.name = "QuickAnalysisValidationError"; } }

// 원문(originalAnswer) 기준 정확 매칭 — annotations.phrase는 fuzzy 허용 없이, 공백/개행 차이만 정규화해서 원문의 실제 구간을 찾는다.
function buildWhitespaceMap(text: string) {
  let normalized = ""; const map: number[] = []; let lastWasSpace = true;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) { if (!lastWasSpace) { normalized += " "; map.push(i); lastWasSpace = true; } }
    else { normalized += ch; map.push(i); lastWasSpace = false; }
  }
  if (normalized.endsWith(" ")) { normalized = normalized.slice(0, -1); map.pop(); }
  return { normalized, map };
}

function findAllOccurrences(source: string, needle: string) {
  const indices: number[] = []; let from = 0;
  while (needle) { const at = source.indexOf(needle, from); if (at === -1) break; indices.push(at); from = at + 1; }
  return indices;
}

export function locatePhraseInOriginal(original: string, phrase: string) {
  const source = buildWhitespaceMap(original); const needle = buildWhitespaceMap(phrase);
  if (!needle.normalized) return null;
  const occurrences = findAllOccurrences(source.normalized, needle.normalized);
  if (occurrences.length !== 1) return null; // 0번(못 찾음) 또는 2번 이상(중복, 위치 특정 불가) 모두 제외 — 임의로 첫 번째를 고르지 않는다.
  const at = occurrences[0];
  const start = source.map[at]; const end = source.map[at + needle.normalized.length - 1] + 1;
  return { start, end, phrase: original.slice(start, end) }; // phrase = 원문에서 그대로 슬라이스한 canonical 문구
}

// 위치를 찾을 수 없는 annotation은 그 항목만 조용히 제외한다(전체 분석은 실패시키지 않음, 원문 내용은 로그에 남기지 않음 — 집계는 droppedCount로).
// 겹침/병합(같은 구간 병합, 부분 겹침 시 카드에만 남기기)은 렌더링 시점 관심사라 화면(UI)에서 start/end로 계산한다.
export function resolveOriginalAnnotations<T extends { phrase: string }>(originalAnswer: string, annotations: T[]): { annotations: (T & { phrase: string; start: number; end: number })[]; droppedCount: number } {
  let droppedCount = 0;
  const resolved = annotations.flatMap((annotation) => {
    const located = locatePhraseInOriginal(originalAnswer, annotation.phrase);
    if (!located) { droppedCount += 1; return []; }
    return [{ ...annotation, phrase: located.phrase, start: located.start, end: located.end }];
  });
  resolved.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  return { annotations: resolved, droppedCount };
}
