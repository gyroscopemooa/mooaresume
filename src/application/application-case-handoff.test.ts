import { describe, expect, it } from "vitest";
import { buildApplicationCasePlan, guestApplicationHandoffSchema } from "./application-case-handoff";

const base = {
  title: "현대모비스 생산관리",
  product: "PRO" as const,
  writingMode: "BUILD" as const,
  writingStyle: "BALANCED" as const,
  targetLength: 700,
  questions: [{
    id: "question-1",
    order: 1,
    title: "지원동기",
    prompt: "지원동기를 작성해 주세요.",
    answer: "생산 현장 경험을 바탕으로 지원했습니다.",
    targetLength: 700,
  }],
  jobPosting: {
    text: "생산관리 직무 채용공고",
    url: "",
    filenames: [],
  },
  candidateMaterials: {
    schemaVersion: "1.0" as const,
    freeformNotes: "편의점 야간 교대근무 경험",
    freeformAttachments: [{
      filename: "경험정리.txt",
      extension: "txt",
      sizeBytes: 100,
      text: "학교 축제 부스 운영 경험",
    }],
    experiences: [],
    profileEntries: [],
  },
};

describe("application case handoff", () => {
  it("rejects a handoff without any analyzable source", () => {
    const result = guestApplicationHandoffSchema.safeParse({
      ...base,
      questions: [],
      jobPosting: { text: "", url: "", filenames: [] },
    });
    expect(result.success).toBe(false);
  });

  it("plans immutable source documents with explicit snapshot purposes", () => {
    const input = guestApplicationHandoffSchema.parse(base);
    const plan = buildApplicationCasePlan(input);

    expect(plan.documents.map((document) => document.purpose)).toEqual([
      "PRIMARY",
      "JOB_CONTEXT",
      "REFERENCE",
      "REFERENCE",
    ]);
    expect(plan.documents.find((document) => document.originalFilename === "경험정리.txt")).toMatchObject({
      kind: "OTHER",
      sourceType: "FILE",
      normalizedText: "학교 축제 부스 운영 경험",
    });
  });

  it("allows CREATE to start from a job posting without a cover letter", () => {
    const input = guestApplicationHandoffSchema.parse({
      ...base,
      writingMode: "CREATE",
      questions: [],
    });
    expect(buildApplicationCasePlan(input).documents[0].kind).toBe("JOB_POSTING");
  });
});
