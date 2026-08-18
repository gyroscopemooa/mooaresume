import type { AnalysisRequest, ResumeAnalysisProvider } from "@/application/analysis-contract";
import { resultDocumentSchema, type ResultDocument } from "@/domain/result-document";

export type QuickAnalysisRunContext = {
  analysisRunId: string;
  request: AnalysisRequest;
};

export interface QuickAnalysisRunRepository {
  begin(analysisRunId: string): Promise<QuickAnalysisRunContext>;
  complete(analysisRunId: string, result: ResultDocument): Promise<void>;
  fail(analysisRunId: string, failureCode: string, retryable: boolean): Promise<void>;
}

function classifyFailure(error: unknown) {
  if (error instanceof Error && error.name === "QuickAnalysisValidationError") {
    const issueCodes = "issues" in error && Array.isArray(error.issues)
      ? error.issues.map((issue) => issue.code)
      : [];
    console.error("quick_analysis_validation_failed", { issueCodes });
    return { code: "AI_OUTPUT_VALIDATION_FAILED", retryable: false };
  }
  if (error instanceof Error && error.message.includes("OpenAI Responses API")) {
    return { code: "AI_PROVIDER_FAILED", retryable: true };
  }
  return { code: "ANALYSIS_FAILED", retryable: false };
}

export class QuickAnalysisOrchestrator {
  constructor(
    private readonly repository: QuickAnalysisRunRepository,
    private readonly provider: ResumeAnalysisProvider,
  ) {}

  async execute(analysisRunId: string): Promise<ResultDocument> {
    let context: QuickAnalysisRunContext | null = null;
    try {
      context = await this.repository.begin(analysisRunId);
      if (context.request.product !== "QUICK") {
        throw new Error("QUICK_ANALYSIS_REQUIRED");
      }
      const result = resultDocumentSchema.parse(
        await this.provider.analyze(context.request),
      );
      await this.repository.complete(context.analysisRunId, result);
      return result;
    } catch (error) {
      if (context) {
        const failure = classifyFailure(error);
        await this.repository.fail(context.analysisRunId, failure.code, failure.retryable);
      }
      throw error;
    }
  }
}
