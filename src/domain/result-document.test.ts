import { describe, expect, it } from "vitest";
import { sampleResultDocument } from "@/fixtures/result-document";
import {
  buildFinalDocumentText,
  countCompactCharacters,
  resultDocumentSchema,
} from "./result-document";

describe("resultDocumentSchema", () => {
  it("accepts the typed PRO result fixture", () => {
    expect(resultDocumentSchema.safeParse(sampleResultDocument).success).toBe(true);
  });

  it("limits priorities to the top three", () => {
    const priorities = [
      ...sampleResultDocument.priorities,
      { ...sampleResultDocument.priorities[0], id: "priority-4" },
    ];
    expect(resultDocumentSchema.safeParse({ ...sampleResultDocument, priorities }).success).toBe(false);
  });

  it("requires questions to retain a positive target length", () => {
    const questions = [{ ...sampleResultDocument.questions[0], targetLength: 0 }];
    expect(resultDocumentSchema.safeParse({ ...sampleResultDocument, questions }).success).toBe(false);
  });
});

describe("result document helpers", () => {
  it("counts Korean characters without whitespace", () => {
    expect(countCompactCharacters("가 나\n다")).toBe(3);
  });

  it("builds a final document using edited answers", () => {
    const result = buildFinalDocumentText(sampleResultDocument, { motivation: "사용자가 수정한 지원동기" });
    expect(result).toContain("현대모비스 · 생산관리");
    expect(result).toContain("사용자가 수정한 지원동기");
    expect(result).toContain("2. 직무 역량");
  });
});
