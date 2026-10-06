import "server-only";

import { z } from "zod";
import type { AnalysisRequest } from "@/application/analysis-contract";
import {
  buildQuickAnalysisInput,
  buildQuickAnalysisInstructions,
  QUICK_PROMPT_VERSION,
  QUICK_RUBRIC_VERSION,
  QUICK_SCHEMA_VERSION,
} from "./prompt";
import { resolveMaxOutputTokens } from "./output-budget";
import { getQuickAnalysisJsonSchema, parseQuickAnalysisOutput, type QuickAnalysisOutput } from "./schema";
import { resolveModelConfig } from "../model-config";
import type { RevisionQuality } from "@/domain/revision-quality";
import { applyRevisionReview, buildRevisionReviewInput, REVISION_REVIEW_INSTRUCTIONS, revisionReviewSchema, type RevisionReview } from "./revision-quality";
import { combineReviews, isRepairEnabled, mergeRepair, planRepair, withRepair, type RepairPlan } from "./revision-repair";
import { BLOCKING_VALIDATION_CODES, validateQuickAnalysis } from "./validator";

const responsesEnvelopeSchema = z.object({
  id: z.string().min(1),
  model: z.string().min(1),
  output_text: z.string().optional(),
  status: z.enum(["queued", "in_progress", "completed", "failed", "cancelled", "incomplete"]).optional(),
  output: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
    }).passthrough()).optional(),
  }).passthrough()).optional(),
  usage: z.object({
    input_tokens: z.number().int().nonnegative().optional(),
    output_tokens: z.number().int().nonnegative().optional(),
    total_tokens: z.number().int().nonnegative().optional(),
  }).passthrough().nullable().optional(),
});

type ResponsesEnvelope = z.infer<typeof responsesEnvelopeSchema>;

export type QuickGatewayResult = {
  revisionQuality?: RevisionQuality;
  output: QuickAnalysisOutput;
  execution: {
    responseId: string;
    model: string;
    promptVersion: string;
    rubricVersion: string;
    schemaVersion: string;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
};

export type QuickBackgroundResponse =
  | { status: "pending"; responseId: string }
  // `repair`가 있으면 첫 검토에서 탈락한 문항 중 검토 의견을 반영해 한 번 더 쓸 수 있는 것이 있다는 뜻이다(꺼져 있으면 항상 없음).
  // `result`는 그 재작성 없이 끝냈을 때의 완성된 결과라서, 재작성을 하지 않거나 중간에 실패해도 그대로 쓴다.
  | { status: "completed"; result: QuickGatewayResult; repair?: RepairPlan }
  | { status: "failed"; responseId: string; reason: string; execution?: QuickGatewayResult["execution"] };

export interface QuickAnalysisGateway {
  analyze(request: AnalysisRequest, validationFeedback?: string[]): Promise<QuickGatewayResult>;
}

export type OpenAIResponsesGatewayOptions = {
  apiKey: string;
  model: string;
  fetchImplementation?: typeof fetch;
};

function extractOutputText(envelope: z.infer<typeof responsesEnvelopeSchema>) {
  if (envelope.output_text) return envelope.output_text;
  for (const item of envelope.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("OpenAI 응답에서 구조화 결과 텍스트를 찾지 못했습니다.");
}

function toOpenAIStrictSchema(input: unknown): Record<string, unknown> {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    const record = value as Record<string, unknown>;
    const next = Object.fromEntries(Object.entries(record).map(([key, child]) => [key, visit(child)]));
    if (next.type === "object" && next.properties && typeof next.properties === "object" && !Array.isArray(next.properties)) {
      next.required = Object.keys(next.properties as Record<string, unknown>);
      next.additionalProperties = false;
    }
    return next;
  };
  return visit(input) as Record<string, unknown>;
}
export class OpenAIResponsesGateway implements QuickAnalysisGateway {
  private readonly fetchImplementation: typeof fetch;

  constructor(private readonly options: OpenAIResponsesGatewayOptions) {
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async startReview(request: AnalysisRequest, candidate: QuickGatewayResult, background = true, onReview?: (review: RevisionReview) => void): Promise<string | QuickGatewayResult> {
    const envelope = await this.postReview(request, candidate, background);
    if (background) return envelope.id;
    return this.finishReview(request, candidate, envelope, onReview);
  }

  private async postReview(request: AnalysisRequest, candidate: QuickGatewayResult, background: boolean): Promise<ResponsesEnvelope> {
    const { model, reasoningEffort } = resolveModelConfig(request.product, this.options.model);
    const response = await this.fetchImplementation("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(background ? 30_000 : 120_000),
      body: JSON.stringify({ model, background, max_output_tokens: Math.min(24000, (reasoningEffort === "high" ? 12000 : 6000) + 800 * (candidate.output.revisions?.length ?? request.questions?.length ?? 1)),
        instructions: REVISION_REVIEW_INSTRUCTIONS, input: buildRevisionReviewInput(request, candidate),
        ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
        text: { format: { type: "json_schema", name: "revision_quality_review", strict: true, schema: toOpenAIStrictSchema(z.toJSONSchema(revisionReviewSchema)) } },
      }),
    });
    if (!response.ok) throw new Error(`OpenAI Responses API quality review failed: status=${response.status}`);
    return responsesEnvelopeSchema.parse(await response.json());
  }

  /** 검토 응답에서 판정을 읽는다. 이 칸이 생기기 전에 시작된 응답도 읽을 수 있게 빠진 칸을 채운다. */
  private readReview(candidate: QuickGatewayResult, envelope: ResponsesEnvelope): RevisionReview {
    let raw: unknown = JSON.parse(extractOutputText(envelope));
    // `crossQuestionOrders`는 이 칸이 생기기 전에 시작된 검토 응답에는 없다. 비운 채로 받는다 — 비어 있으면
    // 예전처럼 문항 간 충돌 판정이 모든 수정을 되돌리므로 진행 중이던 검토가 스키마 변경만으로 실패하지 않는다.
    if (raw && typeof raw === "object" && !Array.isArray(raw)) raw = { crossQuestionOrders: [], ...(raw as Record<string, unknown>) };
    // A review started before deployment can finish afterwards. Preserve the
    // old validated verdict, but never assume its unreviewed length note is valid.
    if (/^quick-3\./.test(candidate.execution.promptVersion) && raw && typeof raw === "object" && !Array.isArray(raw)) {
      const legacy = raw as Record<string, unknown>;
      raw = { ...legacy, adviceCorrections: legacy.adviceCorrections ?? [], questions: Array.isArray(legacy.questions)
        ? legacy.questions.map(question => question && typeof question === "object" && !Array.isArray(question)
          ? { validLengthNote: false, ...question } : question) : legacy.questions };
    }
    return revisionReviewSchema.parse(raw);
  }

  private finishReview(request: AnalysisRequest, candidate: QuickGatewayResult, envelope: ResponsesEnvelope, onReview?: (review: RevisionReview) => void): QuickGatewayResult {
    const review = this.readReview(candidate, envelope);
    onReview?.(review);
    const result = applyRevisionReview(request, candidate, review, { responseId: envelope.id, model: envelope.model });
    const sum = (a: number | null, b: number | undefined) => a === null || b === undefined ? null : a + b;
    return { ...result, execution: { ...result.execution,
      inputTokens: sum(candidate.execution.inputTokens, envelope.usage?.input_tokens),
      outputTokens: sum(candidate.execution.outputTokens, envelope.usage?.output_tokens),
      totalTokens: sum(candidate.execution.totalTokens, envelope.usage?.total_tokens),
    } };
  }

  async getReview(responseId: string, request: AnalysisRequest, candidate: QuickGatewayResult): Promise<QuickBackgroundResponse> {
    const response = await this.fetchImplementation(`https://api.openai.com/v1/responses/${encodeURIComponent(responseId)}`, {
      headers: { Authorization: `Bearer ${this.options.apiKey}` }, signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`OpenAI Responses API quality poll failed: status=${response.status}`);
    const envelope = responsesEnvelopeSchema.parse(await response.json());
    if (!envelope.status || envelope.status === "queued" || envelope.status === "in_progress") return { status: "pending", responseId };
    const sum = (a: number | null, b: number | undefined) => a === null || b === undefined ? null : a + b;
    const execution = { ...candidate.execution,
      inputTokens: sum(candidate.execution.inputTokens, envelope.usage?.input_tokens),
      outputTokens: sum(candidate.execution.outputTokens, envelope.usage?.output_tokens),
      totalTokens: sum(candidate.execution.totalTokens, envelope.usage?.total_tokens),
    };
    if (envelope.status !== "completed") return { status: "failed", responseId, reason: "QUALITY_REVIEW_FAILED", execution };
    try {
      const captured: { review?: RevisionReview } = {};
      const result = this.finishReview(request, candidate, envelope, (parsed) => { captured.review = parsed; });
      // 다시 쓸 문항이 있으면 알려 준다. 쓸지 말지는 진행을 맡은 쪽이 정하고, 안 쓰면 `result`가 그대로 최종 결과다.
      const repair = captured.review && isRepairEnabled() ? planRepair(request, candidate, captured.review) : null;
      return { status: "completed", result, ...(repair ? { repair } : {}) };
    } catch (error) {
      // Malformed/contradictory reviews are never presented as an approval.
      const reason = error instanceof Error && error.message.startsWith("REVISION_REVIEW_") ? error.message : "QUALITY_REVIEW_INVALID";
      return { status: "failed", responseId, reason, execution };
    }
  }

  /**
   * 첫 검토에서 탈락한 문항을 검토 의견과 함께 한 번 더 쓰게 한다(백그라운드 응답 ID를 돌려준다).
   * 진행을 맡은 쪽이 `getReview`가 알려 준 `repair` 계획을 넘겨 부른다. 결과는 `getBackground`로 읽는다.
   */
  async startRepair(request: AnalysisRequest, plan: RepairPlan): Promise<string> {
    return this.startBackground(withRepair(request, plan), 1);
  }

  /** 다시 쓴 글을 첫 수정안에 합친 후보를 만들어 두 번째 검토를 시작한다. 합칠 수 없으면 던진다 — 부른 쪽이 첫 검토 결과로 끝낸다. */
  async startRepairReview(request: AnalysisRequest, candidate: QuickGatewayResult, repaired: QuickGatewayResult, firstReviewId: string): Promise<string> {
    const { merged } = await this.mergeRepaired(request, candidate, repaired, firstReviewId);
    const reviewId = await this.startReview(request, merged);
    if (typeof reviewId !== "string") throw new Error("REVISION_REPAIR_REVIEW_ID_REQUIRED");
    return reviewId;
  }

  /** 두 번째 검토를 읽어 최종 결과를 만든다. 다시 쓴 문항은 두 번째 판정, 나머지는 첫 판정을 쓴다(combineReviews). */
  async getRepairReview(reviewId: string, request: AnalysisRequest, candidate: QuickGatewayResult, repaired: QuickGatewayResult, firstReviewId: string): Promise<QuickBackgroundResponse> {
    const envelope = await this.fetchEnvelope(reviewId);
    if (!envelope.status || envelope.status === "queued" || envelope.status === "in_progress") return { status: "pending", responseId: reviewId };
    if (envelope.status !== "completed") return { status: "failed", responseId: reviewId, reason: "REVISION_REPAIR_REVIEW_FAILED" };
    try {
      const { plan, firstReview, firstEnvelope, merged } = await this.mergeRepaired(request, candidate, repaired, firstReviewId);
      const combined = combineReviews(firstReview, this.readReview(merged, envelope), plan);
      if (!combined) throw new Error("REVISION_REPAIR_REVIEW_INCOMPLETE");
      const result = applyRevisionReview(request, merged, combined, { responseId: envelope.id, model: envelope.model }, { repairedOrders: plan.orders });
      // 비용은 작성 + 첫 검토 + 재작성 + 두 번째 검토를 모두 더한다. 하나라도 모르면 모른다고 둔다(기존 합산과 같은 규칙).
      const add = (...values: Array<number | null | undefined>) => values.some((value) => value === null || value === undefined) ? null : values.reduce<number>((total, value) => total + (value as number), 0);
      return { status: "completed", result: { ...result, execution: { ...result.execution,
        inputTokens: add(candidate.execution.inputTokens, firstEnvelope.usage?.input_tokens, repaired.execution.inputTokens, envelope.usage?.input_tokens),
        outputTokens: add(candidate.execution.outputTokens, firstEnvelope.usage?.output_tokens, repaired.execution.outputTokens, envelope.usage?.output_tokens),
        totalTokens: add(candidate.execution.totalTokens, firstEnvelope.usage?.total_tokens, repaired.execution.totalTokens, envelope.usage?.total_tokens),
      } } };
    } catch (error) {
      return { status: "failed", responseId: reviewId, reason: error instanceof Error && error.message.startsWith("REVISION_") ? error.message : "REVISION_REPAIR_INVALID" };
    }
  }

  private async fetchEnvelope(responseId: string): Promise<ResponsesEnvelope> {
    const response = await this.fetchImplementation(`https://api.openai.com/v1/responses/${encodeURIComponent(responseId)}`, {
      headers: { Authorization: `Bearer ${this.options.apiKey}` }, signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`OpenAI Responses API poll failed: status=${response.status}`);
    return responsesEnvelopeSchema.parse(await response.json());
  }

  /** 첫 검토를 다시 읽어 같은 계획을 세우고(같은 입력이면 같은 결과) 다시 쓴 글을 합친다. 합친 글이 기본 검증을 못 넘으면 던진다. */
  private async mergeRepaired(request: AnalysisRequest, candidate: QuickGatewayResult, repaired: QuickGatewayResult, firstReviewId: string) {
    const firstEnvelope = await this.fetchEnvelope(firstReviewId);
    if (firstEnvelope.status !== "completed") throw new Error("REVISION_REPAIR_FIRST_REVIEW_NOT_COMPLETED");
    const firstReview = this.readReview(candidate, firstEnvelope);
    const plan = planRepair(request, candidate, firstReview);
    if (!plan) throw new Error("REVISION_REPAIR_PLAN_MISSING");
    const merged = mergeRepair(candidate, repaired, plan);
    if (!merged) throw new Error("REVISION_REPAIR_MERGE_FAILED");
    if (validateQuickAnalysis(request, merged.output).some((issue) => BLOCKING_VALIDATION_CODES.has(issue.code) || issue.code === "QUESTION_MISMATCH")) throw new Error("REVISION_REPAIR_INVALID");
    return { plan, firstReview, firstEnvelope, merged };
  }

  /** 동기 경로(평가 도구)의 재작성: 같은 규칙을 기다리며 돌린다. 어느 단계든 실패하면 첫 검토 결과를 그대로 돌려준다. */
  private async repairInline(request: AnalysisRequest, candidate: QuickGatewayResult, firstReview: RevisionReview, firstPass: QuickGatewayResult): Promise<QuickGatewayResult> {
    const plan = planRepair(request, candidate, firstReview);
    if (!plan) return firstPass;
    try {
      const repairId = await this.startRepair(request, plan);
      let repaired: QuickGatewayResult | null = null;
      for (let attempt = 0; attempt < 120 && !repaired; attempt += 1) {
        const polled = await this.getBackground(repairId);
        if (polled.status === "completed") repaired = polled.result;
        else if (polled.status === "failed") return firstPass;
        else await new Promise((resolve) => setTimeout(resolve, 4_000));
      }
      if (!repaired) return firstPass;
      const merged = mergeRepair(candidate, repaired, plan);
      if (!merged || validateQuickAnalysis(request, merged.output).some((issue) => BLOCKING_VALIDATION_CODES.has(issue.code) || issue.code === "QUESTION_MISMATCH")) return firstPass;
      const envelope = await this.postReview(request, merged, false);
      const combined = combineReviews(firstReview, this.readReview(merged, envelope), plan);
      if (!combined) return firstPass;
      const result = applyRevisionReview(request, merged, combined, { responseId: envelope.id, model: envelope.model }, { repairedOrders: plan.orders });
      const add = (...values: Array<number | null | undefined>) => values.some((value) => value === null || value === undefined) ? null : values.reduce<number>((total, value) => total + (value as number), 0);
      return { ...result, execution: { ...result.execution,
        inputTokens: add(firstPass.execution.inputTokens, repaired.execution.inputTokens, envelope.usage?.input_tokens),
        outputTokens: add(firstPass.execution.outputTokens, repaired.execution.outputTokens, envelope.usage?.output_tokens),
        totalTokens: add(firstPass.execution.totalTokens, repaired.execution.totalTokens, envelope.usage?.total_tokens),
      } };
    } catch {
      return firstPass;
    }
  }

  async analyze(request: AnalysisRequest, validationFeedback: string[] = []): Promise<QuickGatewayResult> {
    const { model, reasoningEffort } = resolveModelConfig(request.product, this.options.model);
    const response = await this.fetchImplementation("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(540_000),
      body: JSON.stringify({
        model,
        // Output was the only leg of the bill with no ceiling, and it is the
        // expensive one. Scaled to the letter rather than fixed: see
        // resolveMaxOutputTokens.
        max_output_tokens: resolveMaxOutputTokens(request, 1, reasoningEffort),
        instructions: buildQuickAnalysisInstructions(request),
        input: [buildQuickAnalysisInput(request), validationFeedback.length ? `[이전 결과 검증 실패]\n${validationFeedback.join("\n")}\n위 문제를 고쳐 전체 JSON을 다시 생성하세요.` : ""].filter(Boolean).join("\n\n"),
        ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
        text: {
          format: {
            type: "json_schema",
            name: "quick_resume_analysis",
            strict: true,
            schema: toOpenAIStrictSchema(getQuickAnalysisJsonSchema(request.product)),
          },
        },
      }),
    });

    if (!response.ok) {
      const requestId = response.headers.get("x-request-id");
      const detail = (await response.text()).slice(0, 1_000);
      throw new Error(`OpenAI Responses API 호출에 실패했습니다. status=${response.status}${requestId ? ` request_id=${requestId}` : ""}${detail ? ` detail=${detail}` : ""}`);
    }

    const envelope = responsesEnvelopeSchema.parse(await response.json());
    const output = parseQuickAnalysisOutput(JSON.parse(extractOutputText(envelope)) as unknown);
    const candidate: QuickGatewayResult = {
      output,
      execution: {
        responseId: envelope.id,
        model: envelope.model,
        promptVersion: QUICK_PROMPT_VERSION,
        rubricVersion: QUICK_RUBRIC_VERSION,
        schemaVersion: QUICK_SCHEMA_VERSION,
        inputTokens: envelope.usage?.input_tokens ?? null,
        outputTokens: envelope.usage?.output_tokens ?? null,
        totalTokens: envelope.usage?.total_tokens ?? null,
      },
    };
    if (validateQuickAnalysis(request, candidate.output).some(issue => BLOCKING_VALIDATION_CODES.has(issue.code))) return candidate;
    const captured: { review?: RevisionReview } = {};
    const reviewed = await this.startReview(request, candidate, false, (review) => { captured.review = review; });
    if (typeof reviewed === "string") throw new Error("QUALITY_REVIEW_NOT_COMPLETED");
    return isRepairEnabled() && captured.review ? this.repairInline(request, candidate, captured.review, reviewed) : reviewed;
  }
  /**
   * 실패한 응답의 본문을 짧게 붙입니다.
   *
   * status만으로는 401(키가 틀림)과 404(모델 이름이 틀림)를 구분할 수 있지만,
   * 400은 무엇이 잘못됐는지가 본문에만 있습니다. 로그에 그 한 줄이 없으면
   * 매번 추측하게 됩니다. 키는 요청 헤더에 있지 본문에 없으므로 여기 섞이지
   * 않습니다.
   */
  private async describeFailureBody(response: Response): Promise<string> {
    try {
      const text = (await response.text()).slice(0, 300).replace(/\s+/g, " ").trim();
      return text ? ` detail=${text}` : "";
    } catch {
      return "";
    }
  }

  async startBackground(request: AnalysisRequest, attemptNo: number = 1): Promise<string> {
    const { model, reasoningEffort } = resolveModelConfig(request.product, this.options.model);
    const response = await this.fetchImplementation("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(30_000), body: JSON.stringify({ model, background: true, max_output_tokens: resolveMaxOutputTokens(request, attemptNo, reasoningEffort), instructions: buildQuickAnalysisInstructions(request), input: buildQuickAnalysisInput(request), ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}), text: { format: { type: "json_schema", name: "quick_resume_analysis", strict: true, schema: toOpenAIStrictSchema(getQuickAnalysisJsonSchema(request.product)) } } }) });
    if (!response.ok) throw new Error(`OpenAI Responses API 백그라운드 시작에 실패했습니다. status=${response.status}${await this.describeFailureBody(response)}`);
    return responsesEnvelopeSchema.parse(await response.json()).id;
  }

  async getBackground(responseId: string): Promise<QuickBackgroundResponse> {
    const response = await this.fetchImplementation(`https://api.openai.com/v1/responses/${encodeURIComponent(responseId)}`, { headers: { Authorization: `Bearer ${this.options.apiKey}` }, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`OpenAI Responses API 응답 조회에 실패했습니다. status=${response.status}${await this.describeFailureBody(response)}`);
    const envelope = responsesEnvelopeSchema.parse(await response.json());
    if (envelope.status === "queued" || envelope.status === "in_progress" || !envelope.status) return { status: "pending", responseId: envelope.id };
    if (envelope.status !== "completed") return { status: "failed", responseId: envelope.id, reason: envelope.status ?? "unknown" };
    return { status: "completed", result: { output: parseQuickAnalysisOutput(JSON.parse(extractOutputText(envelope)) as unknown), execution: { responseId: envelope.id, model: envelope.model, promptVersion: QUICK_PROMPT_VERSION, rubricVersion: QUICK_RUBRIC_VERSION, schemaVersion: QUICK_SCHEMA_VERSION, inputTokens: envelope.usage?.input_tokens ?? null, outputTokens: envelope.usage?.output_tokens ?? null, totalTokens: envelope.usage?.total_tokens ?? null } } };
  }


}

export function createOpenAIResponsesGatewayFromEnv() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) {
    throw new Error("OPENAI_API_KEY와 OPENAI_MODEL 서버 환경변수가 필요합니다.");
  }
  return new OpenAIResponsesGateway({ apiKey, model });
}
