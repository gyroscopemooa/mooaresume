import type { QuickAnalysisOutput } from "./schema";

export type QuickValidationIssue = {
  code: "NEW_NUMBER" | "INVALID_EVIDENCE" | "INVALID_HIGHLIGHT" | "LENGTH_OVER";
  message: string;
};

const compactLength = (value: string) => value.replace(/\s/g, "").length;
const numericTokens = (value: string) => new Set(value.match(/\d+(?:[.,]\d+)?%?/g) ?? []);

export function validateQuickAnalysis(
  original: string,
  output: QuickAnalysisOutput,
  targetLength: number,
): QuickValidationIssue[] {
  const issues: QuickValidationIssue[] = [];
  const sourceNumbers = numericTokens(original);
  const revisedNumbers = numericTokens(output.revision.revisedAnswer);

  for (const number of revisedNumbers) {
    if (!sourceNumbers.has(number)) {
      issues.push({
        code: "NEW_NUMBER",
        message: `원문에 없는 수치 "${number}"가 첨삭본에 추가되었습니다.`,
      });
    }
  }

  for (const reason of output.revision.reasons) {
    if (!original.includes(reason.evidenceQuote)) {
      issues.push({
        code: "INVALID_EVIDENCE",
        message: `수정 이유의 근거가 원문에서 확인되지 않습니다: "${reason.evidenceQuote}"`,
      });
    }
  }

  for (const priority of output.priorities) {
    if (!original.includes(priority.evidenceQuote)) {
      issues.push({
        code: "INVALID_EVIDENCE",
        message: `우선순위의 근거가 원문에서 확인되지 않습니다: "${priority.evidenceQuote}"`,
      });
    }
  }

  for (const phrase of output.revision.highlightedPhrases) {
    if (!output.revision.revisedAnswer.includes(phrase)) {
      issues.push({
        code: "INVALID_HIGHLIGHT",
        message: `강조 문구가 첨삭본에 없습니다: "${phrase}"`,
      });
    }
  }

  if (compactLength(output.revision.revisedAnswer) > Math.ceil(targetLength * 1.15)) {
    issues.push({
      code: "LENGTH_OVER",
      message: "첨삭본이 목표 글자 수의 허용 범위를 초과했습니다.",
    });
  }

  return issues;
}

export class QuickAnalysisValidationError extends Error {
  constructor(public readonly issues: QuickValidationIssue[]) {
    super(issues.map((issue) => issue.message).join("\n"));
    this.name = "QuickAnalysisValidationError";
  }
}
