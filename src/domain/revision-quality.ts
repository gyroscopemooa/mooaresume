import { z } from "zod";

export const REVISION_RUBRIC_VERSION = "revision-quality-2.0";
export const revisionQualitySchema = z.object({
  version: z.enum(["revision-quality-1.0", "revision-quality-2.0"]),
  reviewerResponseId: z.string(),
  reviewerModel: z.string(),
  decision: z.enum(["adopt", "keep_current"]),
  reason: z.string().min(1),
  beforeScore: z.number().min(0).max(100),
  candidateScore: z.number().min(0).max(100),
  inputFingerprint: z.string(),
  contextFingerprint: z.string(),
  parentAnalysisRunId: z.string().nullable(),
  relationship: z.enum(["new", "same_input", "previous_revision"]),
  // 검토 탈락 사유를 반영해 한 번 더 쓴 문항 번호. 없으면(대부분) 재작성이 없었다. 선택 칸이라 이전 코드가 읽어도 무시한다.
  repairedOrders: z.array(z.number().int().min(1)).optional(),
});
export type RevisionQuality = z.infer<typeof revisionQualitySchema>;
