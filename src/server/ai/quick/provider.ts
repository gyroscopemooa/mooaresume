import type { AnalysisRequest, ResumeAnalysisProvider } from "@/application/analysis-contract";
import { splitCoverLetterDraft } from "@/domain/cover-letter-parser";
import { resultDocumentSchema, type ResultDocument } from "@/domain/result-document";
import type { QuickAnalysisGateway, QuickGatewayResult } from "./openai-responses-gateway";
import { QuickAnalysisValidationError, validateQuickAnalysis } from "./validator";

function getQuestions(request: AnalysisRequest) {
  const source = request.documents.find((document) => document.kind === "cover_letter");
  if (!source) throw new Error("QUICK_COVER_LETTER_REQUIRED");
  return (request.questions ?? splitCoverLetterDraft(source.text)).filter((question) => question.answer.trim()).map((question, index) => ({ ...question, order: index + 1, targetLength: question.targetLength ?? request.targetLength }));
}

function toResultDocument(request: AnalysisRequest, gatewayResult: QuickGatewayResult): ResultDocument {
  const source = request.documents.find((document) => document.kind === "cover_letter");
  if (!source) throw new Error("QUICK_COVER_LETTER_REQUIRED");
  const questions = getQuestions(request);
  const output = gatewayResult.output;
  const revisions = new Map((output.revisions ?? (output.revision ? [{ ...output.revision, questionOrder: 1 }] : [])).map((revision) => [revision.questionOrder, revision]));
  return resultDocumentSchema.parse({
    schemaVersion: "1.0", caseId: request.requestId, product: request.product, isSample: false, company: "Applicant company", role: "Applicant role", applicationLabel: `${request.product} cover-letter revision`, analyzedAt: new Date().toISOString(),
    analysisRun: { provider: "openai", responseId: gatewayResult.execution.responseId, model: gatewayResult.execution.model, promptVersion: gatewayResult.execution.promptVersion, rubricVersion: gatewayResult.execution.rubricVersion, schemaVersion: gatewayResult.execution.schemaVersion, inputTokens: gatewayResult.execution.inputTokens, outputTokens: gatewayResult.execution.outputTokens, totalTokens: gatewayResult.execution.totalTokens },
    readiness: output.readiness,
    attachments: source.filename ? [{ id: `${request.requestId}-source`, filename: source.filename, extension: source.filename.split(".").pop()?.toUpperCase() || "TEXT", sizeBytes: new TextEncoder().encode(source.text).length, parseStatus: "ready", parserLabel: "Source document", sectionCount: questions.length }] : [],
    candidateProfile: { snapshotLabel: `${request.product} input`, items: [] }, priorities: output.priorities.map((priority, index) => ({ id: `priority-${index + 1}`, title: priority.title, description: priority.description, category: priority.category, severity: priority.severity })),
    questions: questions.map((question) => { const revision = revisions.get(question.order); if (!revision) throw new Error("QUICK_QUESTION_RESULT_MISSING"); return { id: `quick-question-${question.order}`, order: question.order, title: question.title || `Question ${question.order}`, prompt: question.prompt || "Cover-letter question", targetLength: question.targetLength, originalAnswer: question.answer, revisedAnswer: revision.revisedAnswer, highlightedPhrases: revision.highlightedPhrases.filter((phrase) => revision.revisedAnswer.includes(phrase)), revisionReasons: revision.reasons.map((reason) => reason.reason), verificationNote: revision.verificationNote ?? undefined }; }),
    requirementMatches: [], verificationQuestions: output.verificationQuestions, consultingAdvice: (output.consultingAdvice ?? []).map((item, index) => ({ id: `quick-advice-${index + 1}`, ...item })), interviewQuestions: [],
  });
}

export class QuickAnalysisProvider implements ResumeAnalysisProvider {
  constructor(private readonly gateway: QuickAnalysisGateway, private readonly maxAttempts = 2) {}
  async analyze(request: AnalysisRequest): Promise<ResultDocument> {
    if (request.product !== "QUICK" && request.product !== "PRO") throw new Error("UNSUPPORTED_ANALYSIS_PRODUCT");
    const questions = getQuestions(request); if (!questions.length) throw new Error("QUICK_QUESTION_REQUIRED");
    let feedback: string[] = []; let lastIssues: ReturnType<typeof validateQuickAnalysis> = [];
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) { const gatewayResult = await this.gateway.analyze(request, feedback); const issues = validateQuickAnalysis(questions, gatewayResult.output); lastIssues = issues; if (!issues.length) return toResultDocument(request, gatewayResult); feedback = issues.map((issue) => issue.message); }
    throw new QuickAnalysisValidationError(lastIssues);
  }
}