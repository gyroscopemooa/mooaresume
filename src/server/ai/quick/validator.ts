import type { AnalysisRequest } from "@/application/analysis-contract";
import type { CoverLetterQuestion } from "@/domain/cover-letter-question";
import { getAnalysisQuestions } from "./questions";
import type { QuickAnalysisOutput } from "./schema";

export type QuickValidationIssue = { code: "NEW_NUMBER" | "INVALID_EVIDENCE" | "INVALID_HIGHLIGHT" | "LENGTH_OVER" | "QUESTION_MISMATCH"; message: string };

/**
 * Issues that must block a result from reaching the applicant, per the product
 * philosophy's first rule: never present invented facts, roles, or numbers.
 *
 * The rest (a highlight that no longer matches, an over-length draft) are
 * presentation defects. Failing the whole paid run over them would deny the
 * user a usable result to protect a cosmetic detail, so they are reported but
 * not fatal.
 */
export const BLOCKING_VALIDATION_CODES: ReadonlySet<QuickValidationIssue["code"]> = new Set([
  "NEW_NUMBER",
  "INVALID_EVIDENCE",
]);
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

/**
 * Everything the applicant themselves wrote, and nothing else.
 *
 * The posting is excluded because an employer requirement is not the
 * applicant's experience. A revision request is excluded for the same reason
 * from the other direction: it is an instruction about the draft, not a fact
 * within it, and quoting "에이텍 내용은 빼주세요" as evidence for a judgement
 * would be exactly the unfounded claim this check exists to catch.
 */
const NON_EVIDENCE_KINDS: ReadonlySet<string> = new Set(["job_posting", "revision_request"]);

function candidateEvidenceSource(request: AnalysisRequest) {
  const permittedDocuments = request.product === "PRO"
    ? request.documents.filter((document) => !NON_EVIDENCE_KINDS.has(document.kind))
    : request.documents.filter((document) => document.kind === "cover_letter");
  return permittedDocuments.map((document) => document.text).join("\n");
}

export function validateQuickAnalysis(request: AnalysisRequest, output: QuickAnalysisOutput): QuickValidationIssue[];
export function validateQuickAnalysis(questions: QuickQuestion[], output: QuickAnalysisOutput): QuickValidationIssue[];
export function validateQuickAnalysis(original: string, output: QuickAnalysisOutput, targetLength: number): QuickValidationIssue[];
export function validateQuickAnalysis(input: AnalysisRequest | QuickQuestion[] | string, output: QuickAnalysisOutput, targetLength?: number): QuickValidationIssue[] {
  const request = typeof input === "string" || Array.isArray(input) ? null : input;
  const questions: QuickQuestion[] = typeof input === "string"
    ? [{ id: "legacy", title: "", prompt: "", answer: input, order: 1, targetLength: targetLength ?? 700 }]
    : request ? getAnalysisQuestions(request) : input as QuickQuestion[];
  const issues: QuickValidationIssue[] = [];
  // A PRO revision can rely on submitted additional experience and attachments.
  // A job posting remains excluded so employer requirements never become facts.
  const sourceText = request ? candidateEvidenceSource(request) : questions.map((question) => question.answer).join("\n");
  const normalizedSource = normalizeEvidence(sourceText);
  for (const priority of output.priorities) if (!evidenceMatchesSource(normalizedSource, priority.evidenceQuote)) issues.push({ code: "INVALID_EVIDENCE", message: `우선순위의 근거가 원문에서 확인되지 않습니다: "${priority.evidenceQuote}"` });
  const revisionList = output.revisions ?? (output.revision ? [{ ...output.revision, questionOrder: 1 }] : []);
  const revisions = new Map(revisionList.map((revision) => [revision.questionOrder, revision]));
  if (revisions.size !== questions.length || questions.some((question) => !revisions.has(question.order))) issues.push({ code: "QUESTION_MISMATCH", message: "입력한 모든 문항의 첨삭 결과가 필요합니다." });
  for (const question of questions) {
    const revision = revisions.get(question.order); if (!revision) continue;
    const sourceNumbers = numericTokens(sourceText);
    for (const number of numericTokens(revision.revisedAnswer)) if (!sourceNumbers.has(number)) issues.push({ code: "NEW_NUMBER", message: `문항 ${question.order} 원문에 없는 수치 "${number}"가 첨삭본에 추가되었습니다.` });
    for (const reason of revision.reasons) if (!evidenceMatchesSource(normalizedSource, reason.evidenceQuote)) issues.push({ code: "INVALID_EVIDENCE", message: `문항 ${question.order} 수정 이유의 근거가 원문에서 확인되지 않습니다: "${reason.evidenceQuote}"` });
    for (const phrase of revision.highlightedPhrases) if (!revision.revisedAnswer.includes(phrase)) issues.push({ code: "INVALID_HIGHLIGHT", message: `문항 ${question.order} 강조 문구가 첨삭본에 없습니다: "${phrase}"` });
    if (compactLength(revision.revisedAnswer) > Math.ceil(Math.max(question.targetLength, compactLength(question.answer)) * 1.15)) issues.push({ code: "LENGTH_OVER", message: `문항 ${question.order} 첨삭본이 목표 글자 수의 허용 범위를 초과했습니다.` });
  }
  return issues;
}
export class QuickAnalysisValidationError extends Error { constructor(public readonly issues: QuickValidationIssue[]) { super(issues.map((issue) => issue.message).join("\n")); this.name = "QuickAnalysisValidationError"; } }