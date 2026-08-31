import { z } from "zod";

export const resultAttachmentSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  extension: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  parseStatus: z.enum(["ready", "warning", "failed"]),
  parserLabel: z.string().min(1),
  sectionCount: z.number().int().nonnegative(),
  warning: z.string().optional(),
});

export const resultPrioritySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(["posting_fit", "evidence", "duplication", "clarity", "length", "verification"]),
  severity: z.enum(["high", "medium", "low"]),
});

export const resultOriginalAnnotationSchema = z.object({
  id: z.string().min(1),
  phrase: z.string().min(1),
  // "fact" marks a claim the submitted text alone cannot verify. Optional
  // `suggestion` carries the rewritten example; results saved before it
  // existed simply have none, so it must stay optional.
  /**
   * typo는 유일하게 "맞다/틀리다"가 분명한 유형입니다.
   *
   * It used to fall into polish, which is capped at two per question and means
   * "would be tidier". A misspelling in a submitted application is not a matter
   * of tidiness and does not compete with an uneven paragraph for one of two
   * slots — every one of them is worth naming, and naming it costs the reader
   * no judgement.
   */
  type: z.enum(["good", "delete", "vague", "revise", "fact", "typo", "polish"]),
  comment: z.string().min(1),
  suggestion: z.string().min(1).optional(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

export const resultQuestionSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  title: z.string().min(1),
  prompt: z.string().min(1),
  targetLength: z.number().int().positive(),
  // Empty on purpose: BUILD fills questions the applicant left blank, and a
  // blank question has no original answer. Requiring one character here failed
  // the whole assembly after the analysis had already run and been paid for.
  originalAnswer: z.string(),
  // A Korean cover letter answer is usually submitted under a one-line title
  // of the applicant's own making, and a weak one costs the reader's attention
  // before the answer is read. Optional because every result stored before this
  // existed has to keep parsing.
  subheading: z.string().min(1).optional(),
  revisedAnswer: z.string().min(1),
  highlightedPhrases: z.array(z.string().min(1)),
  originalAnnotations: z.array(resultOriginalAnnotationSchema).optional(),
  revisionReasons: z.array(z.string().min(1)).min(1),
  verificationNote: z.string().optional(),
});

export const requirementMatchSchema = z.object({
  id: z.string().min(1),
  requirement: z.string().min(1),
  status: z.enum(["matched", "partial", "missing"]),
  evidence: z.string().min(1),
  recommendation: z.string().min(1),
  /**
   * 공고에 그대로 적혀 있었는가(stated), 업무 설명에서 읽어낸 것인가(inferred).
   *
   * The two are worth different things and carry different risk, and until now
   * they arrived in one flat list looking identical. "Excel 활용 가능자" is
   * quoted from the posting; "협업" was derived from a line about working with
   * other teams. Reading a requirement wrong is our mistake. Reading a theme out
   * of the work description is a judgement, and the applicant is the one who
   * should get to make it.
   *
   * Inferred is not the weaker half. It is usually where the difference is made,
   * because a requirement nobody wrote down is a requirement most applicants
   * never answer.
   *
   * Defaulted so results saved before this field existed still parse.
   */
  origin: z.enum(["stated", "inferred"]).default("stated"),
  /**
   * The line of the posting an inferred requirement came from.
   *
   * This is the honesty mechanism, and it is deliberately not a badge reading
   * "AI 판단". A label like that asks to be trusted and reads as a disclaimer;
   * showing the sentence lets the applicant judge for themselves, which is what
   * they are actually equipped to do. Null for stated requirements — the
   * requirement is the quote.
   */
  postingQuote: z.string().min(1).nullable().default(null),
});

// The pricing table sells "면접 리스크 분석" as part of PRO. A risk is not a
// question: it names the weak link in the application, quotes the sentence it
// comes from, and says what to prepare. Defaulted so results saved before this
// field existed still parse.
export const interviewRiskSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  risk: z.string().min(1),
  evidenceQuote: z.string().min(1),
  preparation: z.string().min(1),
});

export const interviewQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  reason: z.string().min(1),
  answerGuide: z.array(z.string().min(1)).min(1),
  relatedQuestionId: z.string().optional(),
});

/**
 * FINAL only. What PRO reads as two documents, FINAL reads as one application.
 *
 * The interviewer opens the résumé and the cover letter side by side, and the
 * questions that hurt come from the gap between them: five months on the résumé
 * described as a long-running initiative in the cover letter, a graduation date
 * that lands after the job it supposedly preceded. PRO has no obligation to
 * find those — it is sold on the posting and the writing. FINAL is sold on
 * exactly this, so the fields live here rather than being folded into the PRO
 * ones, and the result screen can say which product produced them.
 */
export const careerTimelineEntrySchema = z.object({
  id: z.string().min(1),
  /** Copied as written, not normalized: "2023.03~2024.07" and "3년차" are both real answers, and rewriting them invents precision. */
  period: z.string().min(1),
  title: z.string().min(1),
  category: z.enum(["education", "career", "project", "certification", "training", "gap", "other"]),
  /** Which document this row came from. A row seen in only one of the two is the interesting kind. */
  source: z.enum(["resume", "cover_letter", "both"]),
  note: z.string().min(1),
});

export const documentConflictSchema = z.object({
  id: z.string().min(1),
  field: z.enum(["company", "period", "education", "certification", "project", "role", "achievement", "order", "gap"]),
  /** Left side and right side of the contradiction, each quoted from its own document. */
  resumeStatement: z.string().min(1),
  coverLetterQuote: z.string().min(1),
  conflict: z.string().min(1),
  severity: z.enum(["high", "medium", "low"]),
  resolution: z.string().min(1),
});

/**
 * "면접관이라면 여기서 묻습니다."
 *
 * Deliberately not merged with interviewRisks: a PRO risk is a weak link in the
 * writing, while this is a specific thing an interviewer can put a finger on
 * while holding both documents. It carries the follow-up chain because the
 * question that ends a candidate is almost never the first one.
 */
export const interviewerFlagSchema = z.object({
  id: z.string().min(1),
  headline: z.string().min(1),
  observation: z.string().min(1),
  evidenceQuote: z.string().min(1),
  resumeReference: z.string().nullable(),
  likelyQuestion: z.string().min(1),
  followUps: z.array(z.string().min(1)).max(3),
  preparation: z.string().min(1),
  likelihood: z.enum(["high", "medium", "low"]),
});

/**
 * FINAL's Red Team pass.
 *
 * Every other part of this product improves the draft. This one is pointed the
 * other way: given this application, what would a reviewer use as a reason to
 * reject it? Asked in that direction, a model surfaces things it never
 * volunteers when asked to be helpful — a 지원동기 that would fit any company in
 * the industry, a metric with no visible contribution behind it.
 *
 * What happens to a finding depends on the applicant's chosen stance, which is
 * the whole point of having a stance: 안정형 removes the corner, 소신형 is told
 * about it and keeps it on purpose.
 */
export const rejectionRiskSchema = z.object({
  id: z.string().min(1),
  headline: z.string().min(1),
  reason: z.string().min(1),
  evidenceQuote: z.string().min(1),
  severity: z.enum(["high", "medium", "low"]),
  fix: z.string().min(1),
  /** Whether this run acted on it, given the stance. */
  handling: z.enum(["removed", "softened", "kept_by_choice", "needs_applicant"]),
});

/**
 * The same application read by four different readers.
 *
 * One request, four lenses — not four independent reviews, and the screen must
 * not claim otherwise. The honest phrasing is "네 가지 관점에서 점검했습니다",
 * never "네 명이 검토했습니다": the same model on the same context cannot be
 * four independent people, and saying so would be selling something we did not
 * do.
 */
export const reviewerNoteSchema = z.object({
  id: z.string().min(1),
  lens: z.enum(["hr", "field_lead", "domain_expert", "editor"]),
  finding: z.string().min(1),
  evidenceQuote: z.string().min(1),
  recommendation: z.string().min(1),
});

/**
 * Every strong claim in the letter, against the evidence behind it.
 *
 * "문제해결 능력이 있습니다" is not a fact about the applicant; it is a promise
 * that something else in the application will demonstrate. This lists the
 * promises and says which ones are actually paid for.
 */
export const claimEvidenceSchema = z.object({
  id: z.string().min(1),
  claim: z.string().min(1),
  /** Null when nothing in the application supports it — the finding, not a gap in the data. */
  evidenceQuote: z.string().nullable(),
  verdict: z.enum(["supported", "weak", "unsupported"]),
  note: z.string().min(1),
});

/**
 * What survives a first read.
 *
 * Deliberately not "15초 심사": nobody measured that, and a number nobody
 * measured is the kind of false precision this product refuses elsewhere. The
 * finding is the same either way — a reviewer does not read the opening as
 * carefully as the applicant wrote it, so what lands in the first two
 * paragraphs is what lands at all.
 */
export const firstImpressionSchema = z.object({
  remembered: z.array(z.string().min(1)).max(5),
  missing: z.array(z.string().min(1)).max(5),
  openingIssue: z.string().nullable(),
  advice: z.string().min(1),
});

/**
 * Which part of an answer each sentence is doing.
 *
 * The model classifies; nothing here holds a count or a percentage. Counting is
 * arithmetic, and a model asked for "상황 15% / 행동 45%" produces numbers that
 * look measured and are not. The screen computes its own totals from these
 * lists — see countAnswerStructure — so every number shown is one this code
 * derived from quoted sentences the applicant can check.
 */
export const answerStructureSchema = z.object({
  questionOrder: z.number().int().positive(),
  situation: z.array(z.string().min(1)).max(12),
  action: z.array(z.string().min(1)).max(12),
  result: z.array(z.string().min(1)).max(12),
  jobLink: z.array(z.string().min(1)).max(12),
  /** The model's reading of the balance. The numbers beside it are not its work. */
  reading: z.string().min(1),
});

export const finalChecklistItemSchema = z.object({
  id: z.string().min(1),
  item: z.string().min(1),
  why: z.string().min(1),
});

export const resultCandidateProfileSchema = z.object({
  snapshotLabel: z.string().min(1),
  items: z.array(z.object({
    id: z.string().min(1),
    category: z.enum(["education", "grade", "career", "certification", "language", "award", "international", "project", "skill", "other"]),
    label: z.string().min(1),
    value: z.string().min(1),
    detail: z.string().optional(),
    needsVerification: z.boolean(),
  })).max(100),
});

export const consultingAdviceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["add", "remove", "strengthen", "structure", "clarify", "reframe"]),
  title: z.string().min(1),
  guidance: z.string().min(1),
  rationale: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
});

export const resultDocumentSchema = z.object({
  schemaVersion: z.literal("1.0"),
  caseId: z.string().min(1),
  product: z.enum(["QUICK", "PRO", "FINAL"]),
  // The screen has to tell a filled-in BUILD result from a polished one: the
  // parts BUILD wrote are proposals and must be marked as such. Defaulted so
  // results saved before this field existed still parse.
  writingMode: z.enum(["CREATE", "BUILD", "POLISH"]).default("POLISH"),
  isSample: z.boolean(),
  company: z.string().min(1),
  role: z.string().min(1),
  applicationLabel: z.string().min(1),
  analyzedAt: z.string().datetime(),
  analysisRun: z.object({
    provider: z.enum(["mock", "openai"]),
    responseId: z.string().min(1).nullable(),
    model: z.string().min(1),
    promptVersion: z.string().min(1),
    rubricVersion: z.string().min(1),
    schemaVersion: z.string().min(1),
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    totalTokens: z.number().int().nonnegative().nullable(),
  }),
  readiness: z.object({
    score: z.number().int().min(0).max(100),
    label: z.string().min(1),
    summary: z.string().min(1),
    reasons: z.array(z.string().min(1)).min(1),
  }),
  attachments: z.array(resultAttachmentSchema),
  candidateProfile: resultCandidateProfileSchema,
  priorities: z.array(resultPrioritySchema).min(1).max(3),
  questions: z.array(resultQuestionSchema).min(1),
  requirementMatches: z.array(requirementMatchSchema),
  verificationQuestions: z.array(z.string().min(1)),
  editSummary: z.array(z.string().min(1)).max(3).default([]),
  consultingAdvice: z.array(consultingAdviceSchema).max(8).default([]),
  interviewQuestions: z.array(interviewQuestionSchema),
  interviewRisks: z.array(interviewRiskSchema).default([]),
  // FINAL only, and defaulted for the same reason every field above is: every
  // QUICK and PRO result already saved must keep parsing untouched.
  careerTimeline: z.array(careerTimelineEntrySchema).default([]),
  documentConflicts: z.array(documentConflictSchema).default([]),
  interviewerFlags: z.array(interviewerFlagSchema).default([]),
  finalChecklist: z.array(finalChecklistItemSchema).default([]),
  // Whether a résumé (or a document standing in for one) was actually part of
  // this run. Without it the FINAL sections have nothing to cross-check, and an
  // empty cross-check section must say "we could not look" rather than "we
  // looked and found nothing" — those are different answers and only one of
  // them is true. Cannot be inferred from the findings: a run with a résumé and
  // no contradictions produces exactly the same empty arrays.
  suppliedResume: z.boolean().default(false),
  rejectionRisks: z.array(rejectionRiskSchema).default([]),
  reviewerNotes: z.array(reviewerNoteSchema).default([]),
  claimEvidence: z.array(claimEvidenceSchema).default([]),
  firstImpression: firstImpressionSchema.nullable().default(null),
  answerStructures: z.array(answerStructureSchema).default([]),
  // What the run did NOT cover, stated plainly. A question the applicant left
  // blank is excluded from the revision contract, and silently omitting it
  // leaves the user believing it was reviewed. Defaulted so results saved
  // before this field existed still parse.
  coverageNotes: z.array(z.string().min(1)).default([]),
});

export type ResultDocument = z.infer<typeof resultDocumentSchema>;
export type ResultQuestion = z.infer<typeof resultQuestionSchema>;
export type ResultOriginalAnnotation = z.infer<typeof resultOriginalAnnotationSchema>;
export type ResultRequirementMatch = z.infer<typeof requirementMatchSchema>;
export type ResultInterviewRisk = z.infer<typeof interviewRiskSchema>;
export type ResultCandidateProfile = z.infer<typeof resultCandidateProfileSchema>;
export type ResultCareerTimelineEntry = z.infer<typeof careerTimelineEntrySchema>;
export type ResultDocumentConflict = z.infer<typeof documentConflictSchema>;
export type ResultInterviewerFlag = z.infer<typeof interviewerFlagSchema>;
export type ResultFinalChecklistItem = z.infer<typeof finalChecklistItemSchema>;
export type ResultRejectionRisk = z.infer<typeof rejectionRiskSchema>;
export type ResultReviewerNote = z.infer<typeof reviewerNoteSchema>;
export type ResultClaimEvidence = z.infer<typeof claimEvidenceSchema>;
export type ResultFirstImpression = z.infer<typeof firstImpressionSchema>;
export type ResultAnswerStructure = z.infer<typeof answerStructureSchema>;

export function countCompactCharacters(value: string) {
  return value.replace(/\s/g, "").length;
}

export function buildFinalDocumentText(
  document: Pick<ResultDocument, "company" | "role" | "questions">,
  answers: Record<string, string>,
) {
  const heading = `${document.company} · ${document.role}\n`;
  const body = [...document.questions]
    .sort((left, right) => left.order - right.order)
    .map((question) => {
      // Bracketed because that is how a subheading is actually typed into the
      // form — it is part of the submitted answer, not a label on it.
      const subheading = question.subheading ? `[${question.subheading}]\n` : "";
      return `${question.order}. ${question.title}\n${subheading}${answers[question.id] ?? question.revisedAnswer}`;
    })
    .join("\n\n");
  return `${heading}\n${body}`;
}
