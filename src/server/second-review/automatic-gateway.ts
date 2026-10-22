import "server-only";
import { z } from "zod";
import { AUTO_REVIEW_VERSION, CONSULTANT_RULES, VERIFY_RULES, draftRequestSchema, verificationRequestSchema } from "./automatic-contract";

const envelopeSchema = z.object({
  id: z.string(), model: z.string().optional(), status: z.string(),
  output_text: z.string().optional(),
  output: z.array(z.object({
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
  })).optional(),
  usage: z.object({ input_tokens: z.number().optional(), output_tokens: z.number().optional(), total_tokens: z.number().optional() }).nullable().optional(),
});
export type AutomaticPoll =
  | { status: "pending" }
  | { status: "completed"; output: unknown; execution: Record<string, unknown> }
  | { status: "failed" };
export interface AutomaticGateway {
  readonly model?: string;
  start(stage: "draft" | "verify", input: unknown): Promise<string>;
  poll(responseId: string): Promise<AutomaticPoll>;
}
export class AutomaticReviewGateway implements AutomaticGateway {
  constructor(private readonly apiKey: string, readonly model: string, private readonly transport: typeof fetch = fetch) {}
  async start(stage: "draft" | "verify", input: unknown) {
    const schema = z.toJSONSchema(stage === "draft" ? draftRequestSchema : verificationRequestSchema);
    const response = await this.transport("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        model: this.model, background: true, store: true,
        instructions: stage === "draft" ? CONSULTANT_RULES : VERIFY_RULES,
        input: JSON.stringify(input), max_output_tokens: stage === "draft" ? 24000 : 12000,
        text: { format: { type: "json_schema", name: `consultant_${stage}`, strict: true, schema } },
        metadata: { purpose: "admin_second_review", version: AUTO_REVIEW_VERSION, stage },
      }),
    });
    if (!response.ok) throw new Error(`SECOND_REVIEW_START_HTTP_${response.status}`);
    return envelopeSchema.parse(await response.json()).id;
  }
  async poll(responseId: string): Promise<AutomaticPoll> {
    if (!/^resp_[a-zA-Z0-9_-]+$/.test(responseId)) throw new Error("SECOND_REVIEW_INVALID_RESPONSE");
    const response = await this.transport(`https://api.openai.com/v1/responses/${responseId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` }, signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`SECOND_REVIEW_POLL_HTTP_${response.status}`);
    const data = envelopeSchema.parse(await response.json());
    if (data.status === "queued" || data.status === "in_progress") return { status: "pending" };
    if (data.status !== "completed") return { status: "failed" };
    const text = data.output_text ?? data.output?.flatMap(o => o.content ?? []).filter(c => c.type === "output_text").map(c => c.text ?? "").join("");
    if (!text) throw new Error("SECOND_REVIEW_EMPTY_OUTPUT");
    return { status: "completed", output: JSON.parse(text), execution: {
      responseId: data.id, model: data.model ?? this.model, usage: data.usage ?? null,
      promptVersion: AUTO_REVIEW_VERSION, rubricVersion: AUTO_REVIEW_VERSION, schemaVersion: AUTO_REVIEW_VERSION,
    } };
  }
}
