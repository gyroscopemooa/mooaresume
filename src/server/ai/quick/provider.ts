import type { AnalysisRequest, ResumeAnalysisProvider } from "@/application/analysis-contract";
import { resultDocumentSchema, type ResultDocument } from "@/domain/result-document";
import type { QuickAnalysisGateway, QuickGatewayResult } from "./openai-responses-gateway";
import { QuickAnalysisValidationError, validateQuickAnalysis } from "./validator";

function toResultDocument(
  request: AnalysisRequest,
  gatewayResult: QuickGatewayResult,
): ResultDocument {
  const source = request.documents.find((document) => document.kind === "cover_letter");
  if (!source) throw new Error("분석할 자기소개서가 필요합니다.");

  const output = gatewayResult.output;
  return resultDocumentSchema.parse({
    schemaVersion: "1.0",
    caseId: request.requestId,
    product: "QUICK",
    isSample: false,
    company: "지원 기업",
    role: "지원 직무",
    applicationLabel: "QUICK 자기소개서 첨삭",
    analyzedAt: new Date().toISOString(),
    analysisRun: {
      provider: "openai",
      responseId: gatewayResult.execution.responseId,
      model: gatewayResult.execution.model,
      promptVersion: gatewayResult.execution.promptVersion,
      rubricVersion: gatewayResult.execution.rubricVersion,
      schemaVersion: gatewayResult.execution.schemaVersion,
      inputTokens: gatewayResult.execution.inputTokens,
      outputTokens: gatewayResult.execution.outputTokens,
      totalTokens: gatewayResult.execution.totalTokens,
    },
    readiness: output.readiness,
    attachments: source.filename ? [{
      id: `${request.requestId}-source`,
      filename: source.filename,
      extension: source.filename.split(".").pop()?.toUpperCase() || "TEXT",
      sizeBytes: new TextEncoder().encode(source.text).length,
      parseStatus: "ready",
      parserLabel: "로컬 추출 원문",
      sectionCount: 1,
    }] : [],
    candidateProfile: {
      snapshotLabel: "QUICK 분석 입력",
      items: [],
    },
    priorities: output.priorities.map((priority, index) => ({
      id: `priority-${index + 1}`,
      title: priority.title,
      description: priority.description,
      category: priority.category,
      severity: priority.severity,
    })),
    questions: [{
      id: "quick-question-1",
      order: 1,
      title: "자기소개서",
      prompt: "입력한 자기소개서 문항",
      targetLength: request.targetLength,
      originalAnswer: source.text,
      revisedAnswer: output.revision.revisedAnswer,
      highlightedPhrases: output.revision.highlightedPhrases,
      revisionReasons: output.revision.reasons.map((reason) => reason.reason),
      verificationNote: output.revision.verificationNote ?? undefined,
    }],
    requirementMatches: [],
    verificationQuestions: output.verificationQuestions,
    interviewQuestions: [],
  });
}

export class QuickAnalysisProvider implements ResumeAnalysisProvider {
  constructor(
    private readonly gateway: QuickAnalysisGateway,
    private readonly maxAttempts = 2,
  ) {}

  async analyze(request: AnalysisRequest): Promise<ResultDocument> {
    if (request.product !== "QUICK") {
      throw new Error("QuickAnalysisProvider는 QUICK 요청만 처리합니다.");
    }
    const source = request.documents.find((document) => document.kind === "cover_letter");
    if (!source) throw new Error("분석할 자기소개서가 필요합니다.");

    let feedback: string[] = [];
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const gatewayResult = await this.gateway.analyze(request, feedback);
      const issues = validateQuickAnalysis(source.text, gatewayResult.output, request.targetLength);
      if (issues.length === 0) return toResultDocument(request, gatewayResult);
      feedback = issues.map((issue) => issue.message);
    }

    throw new QuickAnalysisValidationError(
      feedback.map((message) => ({ code: "INVALID_EVIDENCE" as const, message })),
    );
  }
}
