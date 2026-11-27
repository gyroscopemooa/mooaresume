import { fitBuildRevisions, numericBuildExample } from "./numeric-build-example";
import { expect, it } from "vitest";
import { createQuickAnalysisResult } from "./provider";
import { validateQuickAnalysis } from "./validator";
import type { AnalysisRequest } from "@/application/analysis-contract";
import type { QuickAnalysisOutput } from "./schema";

it.each([500, 700])("preserves a replacement example for numeric-only PRO input at %i characters and rejects invented evidence", (targetLength) => {
  const source = "123 123123";
  const request: AnalysisRequest = {
    requestId: "numeric-example", product: "PRO", writingMode: "BUILD", writingStyle: "BALANCED", targetLength,
    documents: [{ kind: "cover_letter", text: source }],
    questions: [{ id: "first", title: "지원 동기", prompt: "지원 동기를 작성해 주세요.", answer: source, targetLength }],
  };
  const fallback = numericBuildExample(request);
  expect(fallback).not.toBeNull();
  expect(validateQuickAnalysis(request, fallback!)).toEqual([]);
  expect(fallback!.revision!.revisedAnswer).toMatch(/^\[임의 예시·교체 필요:/);
  expect(numericBuildExample({ ...request, documents: [...request.documents, { kind: "resume", text: "매장 관리 경험" }] })).toBeNull();
  const minimum = Math.ceil(targetLength * 70 / 100);
  const example = (length: number) => "[임의 예시·교체 필요: " + "가".repeat(length - "[임의예시·교체필요:]".length) + "]";
  const body = example(minimum);
  const output: QuickAnalysisOutput = {
    schemaVersion: "1.0", readiness: { score: 0, label: "보완 권장", summary: "확인이 필요합니다.", reasons: ["숫자 입력"] },
    priorities: [], verificationQuestions: ["실제로 맡은 역할은 무엇인가요?"],
    revision: { subheading: null, lengthNote: null, revisedAnswer: body, highlightedPhrases: [], originalAnnotations: [], reasons: [], verificationNote: "실제 경험으로 교체해 주세요." },
  };
  expect(validateQuickAnalysis(request, { ...output, revision: { ...output.revision, revisedAnswer: example(minimum - 1) } })).toContainEqual(expect.objectContaining({ code: "ANSWER_TOO_SHORT" }));
  expect(validateQuickAnalysis(request, output)).toEqual([]);
  expect(validateQuickAnalysis(request, { ...output, revision: { ...output.revision, revisedAnswer: example(minimum + 1) } })).toEqual([]);
  expect(validateQuickAnalysis(request, { ...output, revision: { ...output.revision, revisedAnswer: example(targetLength + 1) } })).toContainEqual(expect.objectContaining({ lengthFailure: true }));
  for (const length of [minimum - 41, targetLength + 102]) {
    const adjusted = fitBuildRevisions(request, { ...output, revision: { ...output.revision, revisedAnswer: example(length) } });
    expect(validateQuickAnalysis(request, adjusted)).toEqual([]);
    expect(adjusted.revisions![0].revisedAnswer).toContain("임의 예시·교체 필요");
  }
  expect(validateQuickAnalysis(request, { ...output, revision: { ...output.revision, revisedAnswer: example(targetLength) } })).toEqual([]);
  const result = createQuickAnalysisResult(request, { output, execution: {
    responseId: "fixture", model: "fixture", promptVersion: "test", rubricVersion: "test", schemaVersion: "1.0", inputTokens: 0, outputTokens: 0, totalTokens: 0,
  } });
  expect(result.questions[0]).toMatchObject({ originalAnswer: source, revisedAnswer: body, revisionReasons: [] });
  expect(result.verificationQuestions).toEqual(output.verificationQuestions);
  expect(validateQuickAnalysis(request, { ...output, priorities: [{ title: "확인", description: "확인", category: "verification", severity: "high", evidenceQuote: "팀을 이끌었습니다" }] })).toContainEqual(expect.objectContaining({ code: "INVALID_EVIDENCE" }));
});
