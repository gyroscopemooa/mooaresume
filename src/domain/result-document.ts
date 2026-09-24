import { z } from "zod";
import { revisionQualitySchema } from "./revision-quality";

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
  /**
   * 목표 글자 수를 채우지 못했을 때, 무엇을 알려주면 채울 수 있는지.
   *
   * 프롬프트는 근거 없이 분량을 채우는 것을 금지합니다 — "많은 것을
   * 배웠습니다" 같은 문장으로 채운 100자는 점수를 올리는 것이 아니라
   * 깎습니다. 그래서 짧게 돌아오는 것은 결함이 아니라 의도인데, 그 사실을
   * 손님에게 말하지 않으면 "AI가 대충 했다"로 읽힙니다.
   *
   * 남은 글자 수는 화면이 직접 셉니다. 이 칸은 **왜 못 채웠는지**만 담습니다.
   * 없으면(충분히 채웠거나 모델이 짚지 못했으면) 화면에 아무것도 나오지
   * 않습니다.
   */
  lengthNote: z.string().min(1).optional(),
  revisedAnswer: z.string().min(1),
  highlightedPhrases: z.array(z.string().min(1)),
  originalAnnotations: z.array(resultOriginalAnnotationSchema).optional(),
  revisionReasons: z.array(z.string().min(1)),
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
  revisionQuality: revisionQualitySchema.optional(),
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
  priorities: z.array(resultPrioritySchema).max(3),
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

/**
 * 실제로 붙여넣을 문자열 기준의 글자 수(공백·줄바꿈 포함). 자소서 문항의
 * 목표/제한 글자 수는 이 프로젝트 전체에서 공백 제외(`countCompactCharacters`)
 * 기준이므로 그 판정은 바꾸지 않고, 화면에는 참고용으로 이 값도 함께 보여준다.
 * 이모지 등 서로게이트 쌍 문자가 1자로 세이도록 code point 기준으로 센다.
 */
export function countCharactersWithWhitespace(value: string) {
  return Array.from(value.replace(/\r\n/g, "\n")).length;
}

// 문장이 끝난 줄: 마침표·물음표·느낌표·말줄임표(뒤에 닫는 따옴표·괄호가 붙어도 됨),
// 콜론은 뒤에 설명·목록이 이어지는 자리라 문단 끝으로 본다.
const SENTENCE_END = /[.!?…:。！？：][)\]"'”’」』]*$/;
// 다음 줄이 이 모양으로 시작하면 앞 줄에 이어 붙이지 않는다(목록·번호·첫째/둘째).
// "다. 특히…"처럼 줄이 끊긴 조각이 한글 뒤 마침표로 시작할 수 있어 가·나·다 목록은 넣지 않는다.
const BLOCK_START = /^(?:[-–—•▪■□◆◇○●※*]\s|\d{1,2}[.)]\s|\(\d{1,2}\)|[①-⑳]|\[|(?:첫째|둘째|셋째|넷째|다섯째)[,.]?\s)/;
// 이보다 짧은데 문장부호 없이 끝나는 줄은 소제목·라벨로 보고 이어 붙이지 않는다.
const MIN_WRAPPED_LINE = 20;

/** 한글 음절의 받침이 ㄹ인가("바꿀", "할", "얻을"의 마지막 글자). */
function endsWithRieulBatchim(value: string) {
  const code = value.charCodeAt(value.length - 1);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8;
}

/**
 * PDF·한글·워드에서 복사한 글은 화면 폭마다 줄이 끊겨 문장 한가운데("어|떤",
 * "있습니|다")에서 줄바꿈이 들어온다. AI 첨삭본도 이 줄바꿈을 그대로 따라오는데,
 * 줄바꿈을 전부 문단 경계로 보면 한 문단이 여러 조각으로 갈라진다. 이 줄이
 * 문장 중간에서 끊긴 줄(=이어 붙일 줄)인지 판정한다.
 */
function continuesOnNextLine(lastLine: string, nextLine: string) {
  const before = lastLine.trimEnd();
  return before.length >= MIN_WRAPPED_LINE && !SENTENCE_END.test(before) && !BLOCK_START.test(nextLine.trimStart());
}

function joinWrappedLines(current: string, nextLine: string) {
  const before = current.trimEnd();
  const after = nextLine.trimStart();
  // 줄 끝·줄 시작에 공백이 남아 있으면 단어 사이다. 끊기면서 공백이 사라진 경우는
  // 단어 중간에서 끊긴 경우가 대부분이라 그냥 붙이고, 자소서에 아주 흔한
  // "~ㄹ 수 있/없" 하나만 띄어쓰기를 복원한다.
  const spaced =
    current !== before ||
    after !== nextLine ||
    (endsWithRieulBatchim(before) && /^수 (?:있|없)/.test(after));
  return `${before}${spaced ? " " : ""}${after}`;
}

/**
 * 문장 내용은 그대로 두고 문단 경계만 정리한다.
 * - 빈 줄은 항상 문단 경계다(여러 개여도 빈 줄 하나로 통일).
 * - AI가 "첫째/둘째"처럼 문단을 나눈 자리는 원문에서 줄바꿈 하나뿐이라 그대로
 *   복사·저장하면 하나의 덩어리처럼 보였다. 문장이 끝난 줄 뒤의 줄바꿈은 문단
 *   경계로 보고 빈 줄 하나로 벌린다.
 * - 문장이 끝나지 않은 줄 뒤의 줄바꿈은 원문 복사 과정에서 생긴 줄끊김이므로
 *   앞 줄에 이어 붙인다(사용자 신고: 문장 중간에서 문단이 갈라져 보임).
 */
export function normalizeAnswerParagraphs(text: string) {
  const paragraphs: string[] = [];
  for (const block of text.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    let current = "";
    let lastLine = "";
    for (const line of block.split("\n")) {
      if (!line.trim()) continue;
      if (current && continuesOnNextLine(lastLine, line)) {
        current = joinWrappedLines(current, line);
      } else {
        if (current) paragraphs.push(current.trim());
        current = line;
      }
      lastLine = line;
    }
    if (current) paragraphs.push(current.trim());
  }
  return paragraphs.join("\n\n");
}

/** 화면에서 문단마다 별도 `<p>`로 그리기 위한 배열. */
export function splitIntoParagraphs(text: string) {
  const normalized = normalizeAnswerParagraphs(text);
  return normalized ? normalized.split("\n\n") : [];
}

// 문단 첫머리에서 "앞 내용에 덧붙인다"는 뜻으로 쓰는 접속어. 뒤에 내용이 이어져야 한다.
const CONNECTOR_LEAD = /^(또한|그리고|아울러|더불어|게다가|이와 함께|한편)[,\s]+(?=\S)/;
// 한 줄짜리 문단으로 볼 최대 길이. 이보다 길면 한 줄이 아니라 독립 문단이다.
const CONNECTOR_LEAD_MAX_LENGTH = 100;
// 다음 문단이 "첫째/둘째…"로 시작하면 나열 구조라서 앞 문단에 붙이지 않는다.
const ENUMERATION_START = /^(?:첫째|둘째|셋째|넷째|다섯째)[,.]?\s/;

export type ConnectorMergeSuggestion = {
  connector: string;
  /** 따로 떨어져 있던 한 줄 문단(원문 그대로). */
  lead: string;
  /** 접속어를 빼고 다음 문단 맨 앞에 붙인 문단. */
  merged: string;
  /** 이 제안 하나만 적용한 답변 전체. */
  resultText: string;
};

function sentenceCount(paragraph: string) {
  return (paragraph.match(/[.!?…](?=\s|$)/g) ?? []).length;
}

/**
 * "또한 ~했습니다." 한 줄이 문단으로 혼자 떨어져 있고 바로 뒤에 그 근거를 풀어 쓴
 * 더 긴 문단이 이어질 때, 접속어를 빼고 그 문단 앞에 붙이자고 제안한다.
 * 주장이 먼저 나오고 근거가 한 문단으로 이어지는 두괄식이 되기 때문이다.
 *
 * AI 호출 없이 정해진 모양만 찾으므로 같은 글이면 항상 같은 결과가 나온다.
 * 제안만 만들 뿐 글을 바꾸지 않는다 — 적용 여부는 지원자가 고른다.
 * 첫 문단, 마지막 문단, "두 가지입니다."처럼 뒤에 나열이 이어지는 도입 문장,
 * 여러 문장인 문단은 건드리지 않는다.
 */
export function suggestConnectorMerges(text: string): ConnectorMergeSuggestion[] {
  const paragraphs = splitIntoParagraphs(text);
  const suggestions: ConnectorMergeSuggestion[] = [];
  for (let index = 1; index < paragraphs.length - 1; index += 1) {
    const lead = paragraphs[index];
    const match = CONNECTOR_LEAD.exec(lead);
    if (!match || lead.length > CONNECTOR_LEAD_MAX_LENGTH || sentenceCount(lead) !== 1 || !SENTENCE_END.test(lead)) continue;
    const next = paragraphs[index + 1];
    if (next.length <= lead.length || ENUMERATION_START.test(next)) continue;
    const merged = `${lead.slice(match[0].length)} ${next}`;
    suggestions.push({
      connector: match[1],
      lead,
      merged,
      resultText: [...paragraphs.slice(0, index), merged, ...paragraphs.slice(index + 2)].join("\n\n"),
    });
    index += 1;
  }
  return suggestions;
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
      const answer = normalizeAnswerParagraphs(answers[question.id] ?? question.revisedAnswer);
      return `${question.order}. ${question.title}\n${subheading}${answer}`;
    })
    .join("\n\n");
  return `${heading}\n${body}`;
}
