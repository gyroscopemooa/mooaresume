import { z } from "zod";
import { quickAnalysisOutputSchema } from "@/server/ai/quick/schema";
import { validateQuickAnalysis } from "@/server/ai/quick/validator";
import { writingModeSchema } from "@/domain/writing-mode";
import { writingStyleSchema } from "@/domain/writing-style";

export const quickEvalCaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  writingMode: writingModeSchema,
  writingStyle: writingStyleSchema,
  targetLength: z.number().int().min(100).max(3000),
  source: z.string().min(1),
  jobContext: z.string().default(""),
  forbiddenTerms: z.array(z.string().min(1)).default([]),
  requiredPreservedTerms: z.array(z.string().min(1)).default([]),
  requiredVerificationTopics: z.array(z.string().min(1)).default([]),
  requiredPriorityCategories: z.array(z.enum(["evidence", "duplication", "clarity", "length", "verification"])).default([]),
});
export type QuickEvalCase = z.infer<typeof quickEvalCaseSchema>;

export type QuickEvalFailureCode =
  | "SCHEMA_INVALID"
  | "NEW_NUMBER"
  | "INVALID_EVIDENCE"
  | "INVALID_HIGHLIGHT"
  | "LENGTH_OVER"
  | "FORBIDDEN_CLAIM"
  | "MISSING_PRESERVED_FACT"
  | "MISSING_VERIFICATION"
  | "MISSING_PRIORITY";

export type QuickEvalCheck = {
  code: QuickEvalFailureCode;
  passed: boolean;
  message: string;
};

export type QuickEvalResult = {
  caseId: string;
  passed: boolean;
  checks: QuickEvalCheck[];
};

function containsTopic(values: string[], topic: string) {
  return values.some((value) => value.includes(topic));
}

export function evaluateQuickOutput(
  fixture: QuickEvalCase,
  rawOutput: unknown,
): QuickEvalResult {
  const parsed = quickAnalysisOutputSchema.safeParse(rawOutput);
  if (!parsed.success) {
    return {
      caseId: fixture.id,
      passed: false,
      checks: [{
        code: "SCHEMA_INVALID",
        passed: false,
        message: parsed.error.issues.map((issue) => issue.path.join(".")).join(", "),
      }],
    };
  }

  const output = parsed.data;
  const checks: QuickEvalCheck[] = validateQuickAnalysis(
    fixture.source,
    output,
    fixture.targetLength,
  ).map((issue) => ({
    code: issue.code,
    passed: false,
    message: issue.message,
  }));

  for (const term of fixture.forbiddenTerms) {
    const passed = !output.revision.revisedAnswer.includes(term);
    checks.push({
      code: "FORBIDDEN_CLAIM",
      passed,
      message: passed ? `금지 주장 없음: ${term}` : `제공되지 않은 주장이 포함됨: ${term}`,
    });
  }

  for (const term of fixture.requiredPreservedTerms) {
    const passed = output.revision.revisedAnswer.includes(term);
    checks.push({
      code: "MISSING_PRESERVED_FACT",
      passed,
      message: passed ? `핵심 사실 보존: ${term}` : `핵심 사실이 첨삭본에서 사라짐: ${term}`,
    });
  }

  const verificationText = [
    ...output.verificationQuestions,
    output.revision.verificationNote ?? "",
  ];
  for (const topic of fixture.requiredVerificationTopics) {
    const passed = containsTopic(verificationText, topic);
    checks.push({
      code: "MISSING_VERIFICATION",
      passed,
      message: passed ? `확인 질문 포함: ${topic}` : `필요한 확인 질문 누락: ${topic}`,
    });
  }

  for (const category of fixture.requiredPriorityCategories) {
    const passed = output.priorities.some((priority) => priority.category === category);
    checks.push({
      code: "MISSING_PRIORITY",
      passed,
      message: passed ? `우선순위 포함: ${category}` : `필요한 우선순위 누락: ${category}`,
    });
  }

  return {
    caseId: fixture.id,
    passed: checks.every((check) => check.passed),
    checks,
  };
}

export function summarizeQuickEval(results: QuickEvalResult[]) {
  const passed = results.filter((result) => result.passed).length;
  const failures = results.flatMap((result) =>
    result.checks.filter((check) => !check.passed).map((check) => ({
      caseId: result.caseId,
      code: check.code,
      message: check.message,
    })),
  );
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: results.length === 0 ? 0 : passed / results.length,
    failures,
  };
}
