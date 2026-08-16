import { z } from "zod";
import { candidateMaterialDraftSchema } from "@/domain/candidate-material";
import { coverLetterQuestionSchema, serializeQuestionAnswers } from "@/domain/cover-letter-question";
import { writingModeSchema } from "@/domain/writing-mode";
import { writingStyleSchema } from "@/domain/writing-style";

export const guestApplicationHandoffSchema = z.object({
  title: z.string().trim().min(1).max(120).default("새 지원서"),
  companyName: z.string().trim().max(120).optional(),
  roleName: z.string().trim().max(120).optional(),
  product: z.enum(["QUICK", "PRO"]),
  writingMode: writingModeSchema,
  writingStyle: writingStyleSchema,
  targetLength: z.number().int().min(100).max(3000),
  questions: z.array(coverLetterQuestionSchema).max(20).default([]),
  sourceFilename: z.string().max(255).optional(),
  jobPosting: z.object({
    text: z.string().max(20000).default(""),
    url: z.union([z.literal(""), z.string().url()]).default(""),
    filenames: z.array(z.string().min(1).max(255)).max(10).default([]),
  }).default({ text: "", url: "", filenames: [] }),
  candidateMaterials: candidateMaterialDraftSchema.default({
    schemaVersion: "1.0",
    freeformNotes: "",
    freeformAttachments: [],
    experiences: [],
    profileEntries: [],
  }),
}).superRefine((value, context) => {
  const hasCoverLetter = value.questions.some((question) => question.answer.trim());
  const hasJobPosting = Boolean(value.jobPosting.text.trim() || value.jobPosting.url);
  if (!hasCoverLetter && !hasJobPosting) {
    context.addIssue({
      code: "custom",
      path: ["questions"],
      message: "자기소개서 또는 채용공고 원문이 하나 이상 필요합니다.",
    });
  }
});

export type GuestApplicationHandoff = z.infer<typeof guestApplicationHandoffSchema>;

export type PlannedDocument = {
  kind: "JOB_POSTING" | "COVER_LETTER" | "OTHER";
  title: string;
  sourceType: "TEXT" | "FILE" | "URL";
  normalizedText: string;
  originalFilename?: string;
  purpose: "PRIMARY" | "JOB_CONTEXT" | "REFERENCE";
};

export type ApplicationCasePlan = {
  title: string;
  companyName: string | null;
  roleName: string | null;
  product: "QUICK" | "PRO";
  writingMode: "CREATE" | "BUILD" | "POLISH";
  writingStyle: "CONCISE" | "BALANCED" | "STRENGTH_FOCUSED";
  targetLength: number;
  documents: PlannedDocument[];
};

export function buildApplicationCasePlan(input: GuestApplicationHandoff): ApplicationCasePlan {
  const documents: PlannedDocument[] = [];
  const answeredQuestions = input.questions.filter((question) => question.answer.trim());

  if (answeredQuestions.length > 0) {
    documents.push({
      kind: "COVER_LETTER",
      title: "자기소개서",
      sourceType: input.sourceFilename ? "FILE" : "TEXT",
      normalizedText: serializeQuestionAnswers(answeredQuestions),
      originalFilename: input.sourceFilename,
      purpose: "PRIMARY",
    });
  }

  if (input.jobPosting.text.trim() || input.jobPosting.url) {
    documents.push({
      kind: "JOB_POSTING",
      title: "채용공고",
      sourceType: input.jobPosting.url && !input.jobPosting.text.trim() ? "URL" : "TEXT",
      normalizedText: input.jobPosting.text.trim() || input.jobPosting.url,
      purpose: "JOB_CONTEXT",
    });
  }

  const materials = input.candidateMaterials;
  const structuredMaterials = {
    freeformNotes: materials.freeformNotes,
    experiences: materials.experiences,
    profileEntries: materials.profileEntries,
  };
  if (materials.freeformNotes.trim() || materials.experiences.length || materials.profileEntries.length) {
    documents.push({
      kind: "OTHER",
      title: "추가 경험·정보",
      sourceType: "TEXT",
      normalizedText: JSON.stringify(structuredMaterials),
      purpose: "REFERENCE",
    });
  }

  for (const attachment of materials.freeformAttachments) {
    documents.push({
      kind: "OTHER",
      title: attachment.filename,
      sourceType: "FILE",
      normalizedText: attachment.text,
      originalFilename: attachment.filename,
      purpose: "REFERENCE",
    });
  }

  return {
    title: input.title,
    companyName: input.companyName || null,
    roleName: input.roleName || null,
    product: input.product,
    writingMode: input.writingMode,
    writingStyle: input.writingStyle,
    targetLength: input.targetLength,
    documents,
  };
}
