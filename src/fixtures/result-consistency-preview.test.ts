import { describe, expect, it } from "vitest";
import { countOverTarget } from "@/domain/answer-length";
import { normalizeQuestionMarkers } from "@/domain/question-marker";
import { countCompactCharacters, resultDocumentSchema } from "@/domain/result-document";
import ResultConsistencyPreviewPage from "@/app/dev/result-consistency-preview/page";
import { buildConsistencyPreview } from "./result-consistency-preview";

describe("result consistency preview fixture", () => {
  it.each(["mixed", "keep"] as const)("%s variant is a valid stored result", (variant) => {
    expect(resultDocumentSchema.safeParse(buildConsistencyPreview(variant)).success).toBe(true);
  });

  it("starts every original with the question line real results carry", () => {
    for (const question of buildConsistencyPreview("mixed").questions) expect(question.originalAnswer.startsWith("질문: ")).toBe(true);
  });

  it("mixed: two questions are edited, three are kept, and the edited ones already lack the question line", () => {
    const result = normalizeQuestionMarkers(buildConsistencyPreview("mixed"));
    const edited = result.questions.filter((question) => question.originalAnswer !== question.revisedAnswer);
    expect(edited.map((question) => question.order)).toEqual([2, 5]);
    expect(result.questions.filter((question) => question.originalAnswer === question.revisedAnswer)).toHaveLength(3);
    for (const question of result.questions) expect(question.originalAnswer.startsWith("질문:")).toBe(false);
  });

  it("one kept question is over its target so the notice has something to show", () => {
    const third = normalizeQuestionMarkers(buildConsistencyPreview("mixed")).questions[2];
    expect(third.originalAnswer).toBe(third.revisedAnswer);
    expect(countOverTarget(third.revisedAnswer, third.targetLength)).toBeGreaterThan(0);
    expect(countCompactCharacters(third.revisedAnswer)).toBeGreaterThan(third.targetLength);
  });

  it("keep: nothing is edited but improvement points are listed", () => {
    const result = buildConsistencyPreview("keep");
    expect(result.revisionQuality?.decision).toBe("keep_current");
    expect(result.priorities.length).toBeGreaterThan(0);
    expect(result.questions.every((question) => question.originalAnswer === question.revisedAnswer)).toBe(true);
  });

  it("the preview page is closed outside development", async () => {
    await expect(ResultConsistencyPreviewPage({ searchParams: Promise.resolve({}) })).rejects.toThrow();
  });
});
