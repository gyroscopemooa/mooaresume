import type { AnalysisRequest, ResumeAnalysisProvider } from "@/application/analysis-contract";
import { resultDocumentSchema, type ResultDocument } from "@/domain/result-document";
import { resolveOriginalAnnotations } from "@/domain/result-original-annotations";
import { getAnalysisQuestions, getUnansweredQuestions } from "./questions";
import type { QuickAnalysisGateway, QuickGatewayResult } from "./openai-responses-gateway";
import { QuickAnalysisValidationError, validateQuickAnalysis } from "./validator";

function getQuestions(request: AnalysisRequest) {
  const source = request.documents.find((document) => document.kind === "cover_letter");
  if (!source) throw new Error("QUICK_COVER_LETTER_REQUIRED");
  return getAnalysisQuestions(request);
}

/**
 * Raised when the model returned revisions for fewer questions than the run
 * covers. Carries the question numbers so the failure can be explained to the
 * applicant instead of surfacing as a bare "분석을 완료하지 못했습니다".
 */
export class QuickQuestionResultMissingError extends Error {
  constructor(readonly missingOrders: number[], readonly totalQuestions: number) {
    super(`QUICK_QUESTION_RESULT_MISSING:${missingOrders.join(",")}/${totalQuestions}`);
    this.name = "QuickQuestionResultMissingError";
  }

  get userMessage() {
    return `${this.missingOrders.join(", ")}번 문항의 첨삭 결과를 받지 못했습니다. (총 ${this.totalQuestions}개 문항)`;
  }
}

/**
 * The model quotes the phrases it wants highlighted, but its quote routinely
 * differs from the revised answer by a line break or a stray space. Demanding
 * an exact substring dropped every phrase, which is why highlights kept
 * disappearing from results. Recover the real substring instead.
 */
function recoverHighlight(revisedAnswer: string, phrase: string): string | null {
  if (revisedAnswer.includes(phrase)) return phrase;
  const target = phrase.replace(/\s+/g, "");
  if (!target) return null;
  for (let start = 0; start < revisedAnswer.length; start += 1) {
    if (/\s/.test(revisedAnswer[start])) continue;
    let collapsed = "";
    for (let end = start; end < revisedAnswer.length; end += 1) {
      if (!/\s/.test(revisedAnswer[end])) collapsed += revisedAnswer[end];
      if (collapsed.length > target.length) break;
      if (collapsed === target) return revisedAnswer.slice(start, end + 1);
    }
  }
  return null;
}

/**
 * Neither QUICK nor PRO collects a company or a role, so the required heading
 * columns used to be filled with English placeholders ("Applicant company")
 * that rendered verbatim on the applicant's own result screen. Name the thing
 * that was actually analysed instead, and never invent an employer.
 */
function describeSubject(filename: string | undefined) {
  const documentName = filename?.replace(/\.[^.]+$/, "").trim();
  return {
    company: documentName || "내 자기소개서",
    role: "자기소개서 첨삭",
    applicationLabel: "자기소개서 첨삭",
  };
}

export function createQuickAnalysisResult(request: AnalysisRequest, gatewayResult: QuickGatewayResult): ResultDocument {
  const source = request.documents.find((document) => document.kind === "cover_letter");
  if (!source) throw new Error("QUICK_COVER_LETTER_REQUIRED");
  const questions = getQuestions(request);
  const output = gatewayResult.output;
  const revisions = new Map((output.revisions ?? (output.revision ? [{ ...output.revision, questionOrder: 1 }] : [])).map((revision) => [revision.questionOrder, revision]));

  // Fail with the specific question numbers rather than at the first gap, so
  // the applicant is told what was not covered instead of just "실패".
  const missingOrders = questions.filter((question) => !revisions.has(question.order)).map((question) => question.order);
  if (missingOrders.length > 0) throw new QuickQuestionResultMissingError(missingOrders, questions.length);

  const coverageNotes = getUnansweredQuestions(request).map((question) => {
    const label = question.title.trim() || question.prompt.trim();
    return `"${label}" 문항은 작성된 내용이 없어 이번 분석에서 제외했습니다.`;
  });

  return resultDocumentSchema.parse({
    schemaVersion: "1.0", caseId: request.requestId, product: request.product, isSample: false, ...describeSubject(source.filename), analyzedAt: new Date().toISOString(),
    analysisRun: { provider: "openai", responseId: gatewayResult.execution.responseId, model: gatewayResult.execution.model, promptVersion: gatewayResult.execution.promptVersion, rubricVersion: gatewayResult.execution.rubricVersion, schemaVersion: gatewayResult.execution.schemaVersion, inputTokens: gatewayResult.execution.inputTokens, outputTokens: gatewayResult.execution.outputTokens, totalTokens: gatewayResult.execution.totalTokens },
    readiness: output.readiness,
    attachments: source.filename ? [{ id: `${request.requestId}-source`, filename: source.filename, extension: source.filename.split(".").pop()?.toUpperCase() || "TEXT", sizeBytes: new TextEncoder().encode(source.text).length, parseStatus: "ready", parserLabel: "Source document", sectionCount: questions.length }] : [],
    candidateProfile: { snapshotLabel: `${request.product} input`, items: [] }, priorities: output.priorities.map((priority, index) => ({ id: `priority-${index + 1}`, title: priority.title, description: priority.description, category: priority.category, severity: priority.severity })),
    questions: questions.map((question) => {
      const revision = revisions.get(question.order)!;
      const questionId = `quick-question-${question.order}`;
      return {
        id: questionId,
        order: question.order,
        title: question.title.trim() || question.prompt.trim().slice(0, 120) || `문항 ${question.order}`,
        prompt: question.prompt.trim() || question.title.trim() || `문항 ${question.order}`,
        targetLength: question.targetLength,
        originalAnswer: question.answer,
        revisedAnswer: revision.revisedAnswer,
        highlightedPhrases: revision.highlightedPhrases.map((phrase) => recoverHighlight(revision.revisedAnswer, phrase)).filter((phrase): phrase is string => phrase !== null),
        originalAnnotations: resolveOriginalAnnotations(question.answer, revision.originalAnnotations, `${questionId}-annotation`),
        revisionReasons: revision.reasons.map((reason) => reason.reason),
        verificationNote: revision.verificationNote ?? undefined,
      };
    }),
    requirementMatches: (output.requirementMatches ?? []).map((match, index) => ({ id: `requirement-${index + 1}`, ...match })),
    verificationQuestions: output.verificationQuestions,
    consultingAdvice: (output.consultingAdvice ?? []).map((item, index) => ({ id: `quick-advice-${index + 1}`, ...item })),
    interviewQuestions: (output.interviewQuestions ?? []).map((item, index) => ({ id: `interview-${index + 1}`, ...item })),
    interviewRisks: (output.interviewRisks ?? []).map((item, index) => ({ id: `interview-risk-${index + 1}`, ...item })),
    coverageNotes,
  });
}

export class QuickAnalysisProvider implements ResumeAnalysisProvider {
  constructor(private readonly gateway: QuickAnalysisGateway, private readonly maxAttempts = 2) {}
  async analyze(request: AnalysisRequest): Promise<ResultDocument> {
    if (request.product !== "QUICK" && request.product !== "PRO") throw new Error("UNSUPPORTED_ANALYSIS_PRODUCT");
    const questions = getQuestions(request); if (!questions.length) throw new Error("QUICK_QUESTION_REQUIRED");
    let feedback: string[] = []; let lastIssues: ReturnType<typeof validateQuickAnalysis> = [];
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) { const gatewayResult = await this.gateway.analyze(request, feedback); const issues = validateQuickAnalysis(questions, gatewayResult.output); lastIssues = issues; if (!issues.length) return createQuickAnalysisResult(request, gatewayResult); feedback = issues.map((issue) => issue.message); }
    throw new QuickAnalysisValidationError(lastIssues);
  }
}
