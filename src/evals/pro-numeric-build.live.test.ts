import { expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import { advanceQuickBackgroundAnalysis } from "@/server/analysis/quick-background-execution";
import { OpenAIResponsesGateway } from "@/server/ai/quick/openai-responses-gateway";
import { validateQuickAnalysis } from "@/server/ai/quick/validator";

it.skipIf(process.env.RUN_LIVE_EVAL !== "1")("delivers a fully marked numeric PRO example after validating real writer output", async () => {
  const request: AnalysisRequest = { requestId: "synthetic-numeric-pro", product: "PRO", writingMode: "BUILD", writingStyle: "BALANCED", targetLength: 700,
    documents: [{kind: "cover_letter", text: "123123"}], questions: [{id: "first", title: "123", prompt: "123", answer: "123123", targetLength: 700}] };
  const gateway = new OpenAIResponsesGateway({apiKey: process.env.OPENAI_API_KEY!, model: process.env.OPENAI_MODEL!});
  const id = await gateway.startBackground(request);
  const deadline = Date.now() + 20 * 60_000;
  let response = await gateway.getBackground(id);
  while (response.status === "pending" && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    response = await gateway.getBackground(id);
  }
  if (response.status !== "completed") throw Error("writer did not complete");
  const writer = response.result;
  const step = await advanceQuickBackgroundAnalysis({
    analysisRunId: "numeric",
    repository: {getRunningContext: async () => ({analysisRunId: "numeric", responseId: "writer", attemptCount: 1, request}), saveBackgroundResponse: async () => {}},
    gateway: {startBackground: async () => {throw Error("unexpected second writer");}, getBackground: async () => ({status: "completed", result: writer})},
  });
  if (step.status !== "polled" || step.response.status !== "completed") throw Error("expected completed result");
  const output = step.response.result.output;
  const answer = output.revision!.revisedAnswer;
  const length = answer.replace(/\s/g, "").length;
  const {model,inputTokens,outputTokens,totalTokens} = writer.execution;
  process.stdout.write(JSON.stringify({ model, inputTokens, outputTokens, totalTokens, length, rawIssues: validateQuickAnalysis(request,writer.output).map(issue => issue.code) }) + "\n");
  expect(length).toBeGreaterThanOrEqual(490);
  expect(length).toBeLessThanOrEqual(700);
  expect(answer).toMatch(/^\s*\[임의 예시·교체 필요:[^\]]+\](?:\s*\[임의 예시·교체 필요:[^\]]+\])*\s*$/);
  expect(validateQuickAnalysis(request, output)).toEqual([]);
}, 1200000);
