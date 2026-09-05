import type { AnalysisRequest } from "@/application/analysis-contract";
import type { CoverLetterQuestion } from "@/domain/cover-letter-question";
import { getAnalysisQuestions } from "./questions";
import type { QuickAnalysisOutput } from "./schema";

export type QuickValidationIssue = { code: "NEW_NUMBER" | "INVALID_EVIDENCE" | "INVALID_HIGHLIGHT" | "LENGTH_OVER" | "ANSWER_TOO_SHORT" | "QUESTION_MISMATCH" | "DUPLICATE_ACROSS_QUESTIONS"; message: string };

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
/**
 * 문항 간에 같은 문장을 그대로 다시 쓴 것으로 보는 길이.
 *
 * 짧은 문구는 겹쳐도 됩니다 — "지원했습니다", "경험이 있습니다" 같은 말은
 * 어느 문항에나 나옵니다. 실제로 문제가 된 판은 130자짜리 한 문장이 두 문항에
 * **글자 하나까지 똑같이** 들어간 경우였습니다. 300자 문항 넷에서 그 한 번이
 * 전체 분량의 10%를 같은 말로 채운 셈입니다.
 *
 * 30자는 그 사이입니다: 관용구는 넘기고, 통째로 복사한 문장은 잡습니다.
 */
const DUPLICATE_SENTENCE_MINIMUM = 30;

/** 문장 단위로 자르고, 비교에 방해되는 것(공백·문장부호)을 뗍니다. */
function sentenceKeys(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase())
    .filter((sentence) => sentence.length >= DUPLICATE_SENTENCE_MINIMUM);
}

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
    // 견줄 기준은 원문 길이가 아니라 **이 문항에 부탁한 길이**입니다.
    //
    // 원문만 보면 정상적인 두 가지 일이 실패로 걸립니다. 첫째, 지원자가
    // 원문보다 짧은 목표 글자 수를 지정한 경우 — 2,000자를 700자로 줄이는
    // 것은 시킨 일인데 35%라서 걸렸습니다. 둘째, CREATE·BUILD에서 원문 자리에
    // 오는 것은 완성된 글이 아니라 사실 메모입니다. 메모를 길게 적을수록
    // 기준이 올라가, 잘 쓴 700자 답변이 메모 2,500자의 28%라며 걸립니다.
    //
    // 실제로 FINAL·내용 보완 결제 건이 이 두 경우로 세 번 연속 걸려 전액
    // 환불됐습니다. 위쪽 한도(`LENGTH_OVER`)는 이미 목표 글자 수를 함께 보고
    // 있었는데 아래쪽만 보지 않고 있었습니다.
    //
    // 목표가 원문보다 길면(BUILD가 채워 주는 경우) 원문을 기준으로 둡니다 —
    // 아직 쓰지 않은 분량을 근거로 실패시킬 수는 없습니다.
    const expectedLength = question.targetLength > 0 ? Math.min(question.targetLength, originalLength) : originalLength;
    if (originalLength >= RATIO_FLOOR_CHARACTERS && compactLength(revision.revisedAnswer) < Math.floor(expectedLength * MIN_REVISION_RATIO)) {
      issues.push({ code: "ANSWER_TOO_SHORT", message: `문항 ${question.order} 첨삭본이 기준 ${expectedLength}자(원문 ${originalLength}자·목표 ${question.targetLength}자)의 절반에도 못 미칩니다(${compactLength(revision.revisedAnswer)}자). 첨삭이 아니라 요약에 가깝습니다.` });
    }
  }
  // 문항 간에 같은 문장을 그대로 다시 쓴 곳.
  //
  // 프롬프트는 이미 두 군데에서 "문항 간 같은 경험을 반복하지 말라"고 말합니다.
  // 그런데도 실제 결제 건에서 130자짜리 한 문장이 2번과 3번 문항에 글자 하나까지
  // 똑같이 들어갔습니다. 시키기만 하고 확인하지 않으면 이렇게 됩니다.
  //
  // 막지는 않습니다(`BLOCKING_VALIDATION_CODES`에 넣지 않음). 겹쳐 쓴 것은
  // 아쉬운 결과이지 거짓말이 아니고, 유료 건을 실패시켜 아무것도 못 받게 하는
  // 것이 더 나쁩니다 — `ANSWER_TOO_SHORT`를 막았다가 전액 환불이 세 번 난
  // 뒤에 배운 것입니다. 재시도 피드백과 기록에만 씁니다.
  const sentenceOwners = new Map<string, Set<number>>();
  for (const [order, revision] of revisions) {
    for (const key of new Set(sentenceKeys(revision.revisedAnswer))) {
      const owners = sentenceOwners.get(key) ?? new Set<number>();
      owners.add(order);
      sentenceOwners.set(key, owners);
    }
  }
  for (const [key, owners] of sentenceOwners) {
    if (owners.size < 2) continue;
    issues.push({
      code: "DUPLICATE_ACROSS_QUESTIONS",
      message: `문항 ${[...owners].sort((a, b) => a - b).join("·")}에 같은 문장이 그대로 들어갔습니다(${key.length}자). 한 문항에서만 자세히 쓰고 나머지는 다른 경험이나 다른 측면으로 바꾸세요.`,
    });
  }

  return issues;
}
/**
 * 시도 원장(`analysis_run_attempts.failure_code`)에 적을 이름.
 *
 * `AI_OUTPUT_VALIDATION_FAILED:NEW_NUMBER,INVALID_EVIDENCE`처럼 **어느 규칙에
 * 걸렸는지까지** 담습니다. 지금까지 규칙 이름은 서버 로그에만 있었고 로그는
 * 지나가면 없어져서, 유료 건이 세 번 걸려 환불된 뒤에 이유를 물으면 답할
 * 데가 없었습니다.
 *
 * **분석 런(`analysis_runs.failure_code`)에는 쓰지 마세요.** 그쪽은 재시도가
 * 가능한지를 문자열이 정확히 같은지로 판단하므로(`canRetryAnalysis`), 뒤에
 * 무엇이든 붙는 순간 재시도가 막히고 곧장 환불로 갑니다. 이 값은 아무 판단에도
 * 쓰이지 않는 읽기 전용 원장 전용입니다.
 */
export const VALIDATION_FAILURE_CODE = "AI_OUTPUT_VALIDATION_FAILED";
export function describeValidationFailure(issues: readonly QuickValidationIssue[]): string {
  const codes = [...new Set(issues.map((issue) => issue.code))];
  return codes.length ? `${VALIDATION_FAILURE_CODE}:${codes.join(",")}` : VALIDATION_FAILURE_CODE;
}

export class QuickAnalysisValidationError extends Error { constructor(public readonly issues: QuickValidationIssue[]) { super(issues.map((issue) => issue.message).join("\n")); this.name = "QuickAnalysisValidationError"; } }