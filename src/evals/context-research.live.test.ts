import { expect, it } from "vitest";
import { researchCompanyContext } from "@/server/ai/context-research";

it.skipIf(process.env.RUN_CONTEXT_LIVE_EVAL !== "1")("public company research smoke, no applicant data", async () => {
  const result = await researchCompanyContext({ company: "도화엔지니어링", role: "토목 설계" }, {
    apiKey: process.env.OPENAI_API_KEY || "", model: process.env.OPENAI_CONTEXT_MODEL || process.env.OPENAI_MODEL || "",
    fetchImplementation: async (input, init) => {
      const response = await fetch(input, init);
      if (!response.ok) {
        const body = await response.clone().json().catch(() => ({}));
        console.log("context_provider_rejection", { status: response.status, code: body.error?.code, param: body.error?.param, type: body.error?.type });
      }
      return response;
    },
  });
  console.log("context_research_smoke", { status: result.status, model: result.model, searchCalls: result.searchCalls, inputTokens: result.inputTokens, outputTokens: result.outputTokens, sources: result.sources });
  expect(result.status).toBe("available");
  expect(result.sources.length).toBeGreaterThan(0);
  expect(result.searchCalls).toBeLessThanOrEqual(2);
}, 45_000);
