import type { AnalysisRequest } from "@/application/analysis-contract";
import type { CoverLetterQuestion } from "@/domain/cover-letter-question";
import { getAnalysisQuestions } from "./questions";
import type { QuickAnalysisOutput } from "./schema";

export type QuickValidationIssue = { code: "NEW_NUMBER" | "INVALID_EVIDENCE" | "INVALID_HIGHLIGHT" | "LENGTH_OVER" | "ANSWER_TOO_SHORT" | "QUESTION_MISMATCH"; message: string };

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
  // 껍데기 결과를 막습니다. 같은 자소서로 세 번 돌린 기록을 보면 한 번은
  // 9,814자를 돌려주고 두 번은 각각 362자·394자를 돌려줬습니다. 뒤의 둘은
  // 첨삭이 아니라 요약에 가까웠는데, `revisedAnswer`가 한 글자라도 있으면
  // 스키마는 통과하므로 그대로 완료로 기록되고 손님에게 전달됐습니다.
  //
  // 막으면 재시도로 넘어갑니다(`AI_OUTPUT_VALIDATION_FAILED`, retryable).
  // 재시도는 예산도 더 크게 잡으므로, 같은 입력에서 제대로 된 판이 나올
  // 가능성이 실제로 있습니다.
  "ANSWER_TOO_SHORT",
]);

/**
 * 첨삭본이 원문의 몇 할 아래로 내려가면 껍데기로 보는가.
 *
 * 덜어내는 첨삭은 정상입니다 — 안정형은 위험한 문장을 지우고, 분량 초과는
 * 줄입니다. 그래도 절반 아래로는 잘 가지 않습니다. 0.4는 그 아래에 두어
 * "많이 덜어낸 첨삭"과 "안 한 첨삭"을 가릅니다. 실제로 문제가 된 판들은
 * 원문의 3~4%였습니다.
 */
const MIN_REVISION_RATIO = 0.4;

/**
 * 이보다 짧은 원문에는 비율을 적용하지 않습니다. 100자짜리 답변에서 40%는
 * 40자이고, 그 정도 차이는 문장 두엇을 다듬기만 해도 납니다.
 */
const RATIO_FLOOR_CHARACTERS = 200;
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
  const permittedDocuments = request.product === "PRO" || request.product === "FINAL"
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
    // 위쪽 한도만 보고 아래쪽을 안 보고 있었습니다. 1,687자 답변이 65자로
    // 돌아와도 통과했다는 뜻입니다.
    //
    // 원문이 비어 있는 문항(CREATE·BUILD가 채워 주는 자리)은 견줄 것이 없으니
    // 건너뜁니다.
    const originalLength = compactLength(question.answer);
    if (originalLength >= RATIO_FLOOR_CHARACTERS && compactLength(revision.revisedAnswer) < Math.floor(originalLength * MIN_REVISION_RATIO)) {
      issues.push({ code: "ANSWER_TOO_SHORT", message: `문항 ${question.order} 첨삭본이 원문 ${originalLength}자의 절반에도 못 미칩니다(${compactLength(revision.revisedAnswer)}자). 첨삭이 아니라 요약에 가깝습니다.` });
    }
  }
  return issues;
}
export class QuickAnalysisValidationError extends Error { constructor(public readonly issues: QuickValidationIssue[]) { super(issues.map((issue) => issue.message).join("\n")); this.name = "QuickAnalysisValidationError"; } }