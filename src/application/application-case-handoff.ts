import { z } from "zod";
import { CANDIDATE_MATERIAL_LABEL, candidateMaterialDraftSchema } from "@/domain/candidate-material";
import { coverLetterQuestionSchema, resolveDraftTargetLength, serializeQuestionAnswers } from "@/domain/cover-letter-question";
import { writingModeSchema } from "@/domain/writing-mode";
import { writingStyleSchema } from "@/domain/writing-style";
import { editingStanceSchema, type EditingStance } from "@/domain/editing-stance";

export const guestApplicationHandoffSchema = z.object({
  title: z.string().trim().min(1).max(120).default("새 지원서"),
  companyName: z.string().trim().max(120).optional(),
  roleName: z.string().trim().max(120).optional(),
  product: z.enum(["QUICK", "PRO", "FINAL"]),
  writingMode: writingModeSchema,
  writingStyle: writingStyleSchema,
  // Defaulted rather than required so drafts saved before the stance existed
  // still parse out of sessionStorage.
  editingStance: editingStanceSchema.default("BALANCED"),
  // Set only when the applicant asked for a re-run from a finished result.
  revisionRequest: z.string().max(2_000).optional(),
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
    materialAttachments: [],
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
  kind: "JOB_POSTING" | "COVER_LETTER" | "RESUME" | "CAREER_DOCUMENT" | "PORTFOLIO" | "CERTIFICATE" | "REVISION_REQUEST" | "OTHER";
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
  product: "QUICK" | "PRO" | "FINAL";
  writingMode: "CREATE" | "BUILD" | "POLISH";
  writingStyle: "CONCISE" | "BALANCED" | "STRENGTH_FOCUSED";
  editingStance: EditingStance;
  targetLength: number;
  documents: PlannedDocument[];
};

function describeCandidateMaterials(materials: GuestApplicationHandoff["candidateMaterials"]): string {
  const sections: string[] = [];

  if (materials.profileEntries.length > 0) {
    sections.push(
      ["[기본 정보·자격]", ...materials.profileEntries.map((entry) => {
        const parts = [entry.name, entry.valueOrStatus, entry.institution, entry.date].filter((part) => part.trim());
        const note = entry.applicationNote.trim() ? ` / 활용 메모: ${entry.applicationNote.trim()}` : "";
        return `- (${entry.category}) ${parts.join(" · ")}${note}`;
      })].join("\n"),
    );
  }

  if (materials.experiences.length > 0) {
    sections.push(
      ["[경험]", ...materials.experiences.map((experience) => {
        const lines = [`- (${experience.category}) ${experience.title.trim() || "제목 없음"}${experience.period.trim() ? ` · ${experience.period.trim()}` : ""}`];
        for (const [label, value] of [["요약", experience.summary], ["상황", experience.situation], ["행동", experience.action], ["결과", experience.result], ["강조하고 싶은 점", experience.emphasis]] as const) {
          if (value.trim()) lines.push(`  ${label}: ${value.trim()}`);
        }
        return lines.join("\n");
      })].join("\n"),
    );
  }

  if (materials.freeformNotes.trim()) {
    sections.push(`[자유 메모]\n${materials.freeformNotes.trim()}`);
  }

  return sections.join("\n\n");
}

export function buildApplicationCasePlan(input: GuestApplicationHandoff): ApplicationCasePlan {
  const documents: PlannedDocument[] = [];
  const answeredQuestions = input.questions.filter((question) => question.answer.trim());

  // The wizard now lets CREATE finish on uploaded materials with zero memo —
  // see fillsQuestionsFromMaterials in server/ai/quick/questions.ts, which
  // this mirrors without importing it (that module is analysis-layer, this
  // one builds the submission before an AnalysisRequest exists). Without this
  // branch, a materials-only run had no answered question anywhere, so no
  // PRIMARY document was ever saved, the checkout precondition saw a
  // zero-character primary document, and every such run was rejected with
  // PRIMARY_DOCUMENT_REQUIRED before the analysis it was designed for could
  // even start.
  const hasQuestionPrompts = input.questions.some((question) => question.title.trim() || question.prompt.trim());
  // FINAL is PRO plus its own verification pass, so every PRO capability check
  // has to name it too. This is the sixth place a bare `=== "PRO"` quietly
  // excluded FINAL; here it meant a materials-only FINAL run saved no PRIMARY
  // document and was rejected before it started.
  const createsFromMaterialsOnly = (input.product === "PRO" || input.product === "FINAL")
    && input.writingMode === "CREATE"
    && hasQuestionPrompts
    && input.candidateMaterials.materialAttachments.length > 0;

  if (answeredQuestions.length > 0 || createsFromMaterialsOnly) {
    documents.push({
      kind: "COVER_LETTER",
      title: "자기소개서",
      sourceType: input.sourceFilename ? "FILE" : "TEXT",
      // Carry unanswered questions through to the saved document. They are the
      // very thing PRO BUILD is sold to fill in ("빈 문항까지 보완하려면 PRO ·
      // 내용 보완으로"), and dropping them here deleted the prompt before the
      // analysis ever saw it.
      normalizedText: serializeQuestionAnswers(input.questions, { includeEmptyAnswers: true, includeTargetLength: true }),
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

  if (input.revisionRequest?.trim()) {
    documents.push({
      kind: "REVISION_REQUEST",
      title: "재첨삭 요청사항",
      sourceType: "TEXT",
      normalizedText: input.revisionRequest.trim(),
      purpose: "REFERENCE",
    });
  }

  const materials = input.candidateMaterials;
  if (materials.freeformNotes.trim() || materials.experiences.length || materials.profileEntries.length) {
    documents.push({
      kind: "OTHER",
      title: "추가 경험·정보",
      sourceType: "TEXT",
      // Stored as readable prose rather than JSON.stringify: this text is fed
      // straight into the analysis prompt, and a raw JSON blob buries the
      // facts the model is supposed to draw evidence from.
      normalizedText: describeCandidateMaterials(materials),
      purpose: "REFERENCE",
    });
  }

  // Labelled uploads keep their own document kind so the prompt can name them.
  // getRunningContext maps RESUME/CAREER_DOCUMENT/PORTFOLIO into the supporting
  // set, which only PRO runs are allowed to read.
  for (const attachment of materials.materialAttachments) {
    documents.push({
      kind: attachment.kind,
      title: CANDIDATE_MATERIAL_LABEL[attachment.kind],
      sourceType: "FILE",
      normalizedText: attachment.text,
      originalFilename: attachment.filename,
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
    editingStance: input.editingStance,
    // Derived, never taken at face value: the entry screens pass a placeholder
    // here while the real limits sit on the questions.
    targetLength: resolveDraftTargetLength(input.questions, input.targetLength),
    documents,
  };
}
