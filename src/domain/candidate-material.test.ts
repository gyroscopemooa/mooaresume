import { describe, expect, it } from "vitest";
import { candidateMaterialDraftSchema } from "./candidate-material";

describe("candidate material draft", () => {
  it("accepts unstructured experience notes as the default PRO input", () => {
    const result = candidateMaterialDraftSchema.parse({
      schemaVersion: "1.0",
      experiences: [],
      profileEntries: [],
      freeformNotes: "운전면허 2종, 편의점 야간 아르바이트 8개월, 일본 체류 경험",
    });
    expect(result.freeformNotes).toContain("편의점");
  });

  it("keeps older saved drafts compatible", () => {
    const result = candidateMaterialDraftSchema.parse({ schemaVersion: "1.0", experiences: [], profileEntries: [] });
    expect(result.freeformNotes).toBe("");
  });

  it("keeps locally extracted attachments separate from freeform notes", () => {
    const result = candidateMaterialDraftSchema.parse({
      schemaVersion: "1.0",
      freeformNotes: "추가 메모",
      experiences: [],
      profileEntries: [],
      freeformAttachments: [{
        filename: "경험정리.pdf",
        extension: "pdf",
        sizeBytes: 1024,
        text: "학교 축제 부스 운영 경험",
      }],
    });
    expect(result.freeformAttachments[0].filename).toBe("경험정리.pdf");
  });

  it("accepts multiple document-less experiences", () => {
    expect(candidateMaterialDraftSchema.safeParse({
      schemaVersion: "1.0",
      profileEntries: [],
      experiences: [{
        id: "experience-1",
        category: "PART_TIME",
        title: "편의점 야간 아르바이트",
        summary: "편의점에서 1년 동안 재고와 시재를 확인하고 교대 인수인계를 했음",
        period: "8개월",
        situation: "교대근무",
        action: "시재와 재고를 인수인계",
        result: "누락 방지",
        emphasis: "업무 연속성",
      }],
    }).success).toBe(true);
  });
});
