import "server-only";

import { z } from "zod";
import {
  buildPortfolioBuildPrompt,
  normalizePortfolioBuildOutput,
  portfolioBuildOutputSchema,
  type PortfolioBuildOutput,
  type PortfolioBuildRequest,
} from "@/domain/portfolio-build";
import { callDocumentBuildModel, type DocumentBuildModelOptions } from "@/server/ai/document-build-model";

/**
 * AI 포트폴리오 설명글의 모델 호출.
 *
 * 지시문의 핵심은 두 가지입니다. ① 프로젝트 번호를 지켜라 — 번호가 섞이면
 * A의 성과가 B에 붙고, 그건 면접에서 바로 걸립니다. ② 없는 성과를 만들지
 * 마라 — 포트폴리오에서 가장 흔한 거짓말이 "30% 개선"입니다.
 */

export const PORTFOLIO_BUILD_PROMPT_VERSION = "portfolio-build-2026-09-06";

export function buildPortfolioBuildInstructions(): string {
  return [
    "당신은 지원자의 포트폴리오에 들어갈 프로젝트 설명글을 정리하는 도구입니다. 서식이나 디자인이 아니라 글만 만듭니다.",
    "",
    "지켜야 할 것:",
    "1. 입력에 있는 [프로젝트 N]의 번호를 결과의 index에 그대로 씁니다. 프로젝트를 합치거나 나누지 마세요. 입력에 없는 프로젝트를 만들지 마세요.",
    "2. 자료에 없는 성과·수치·기간·역할을 절대 만들지 마세요. 특히 '30% 개선', '매출 2배' 같은 수치는 지원자가 적었거나 자료에 있을 때만 씁니다. 없으면 results를 비우고 notes에 무엇을 채워야 하는지 적습니다.",
    "3. problem(문제)은 그 프로젝트가 왜 필요했는지, actions(실행)는 지원자가 실제로 한 일, results(성과)는 그래서 무엇이 달라졌는지입니다. 팀 전체가 한 일과 지원자 본인이 한 일이 구분되지 않으면 role에 그대로 적고 지어내지 않습니다.",
    "4. actions와 results는 한 항목에 하나씩, 짧은 문장으로 나눕니다.",
    "5. oneLiner는 목차에 쓸 한 줄입니다. 20자 안팎으로 무엇을 한 프로젝트인지만 적습니다.",
    "6. skills는 그 프로젝트에서 실제로 쓴 도구·기술·역량만 쉼표로 나열합니다. 자료에서 확인되지 않는 기술 이름을 넣지 마세요.",
    "7. evidence에는 그 프로젝트 설명이 어디서 나왔는지 짧게 적습니다(예: '프로젝트 1 본인 설명', '기획서.pdf').",
    "8. [지원 방향]이 주어지면 그 직무가 볼 만한 부분을 앞세우고 표현을 그 직무의 말로 고릅니다. 없는 경험을 만들지는 않습니다 — 순서와 강조만 바꿉니다.",
    "9. 파일 자료가 어느 프로젝트의 것인지 확실하지 않으면 붙이지 마세요. 확실하지 않은 연결은 notes에 적어 사람이 판단하게 합니다.",
    "10. headline은 포트폴리오 첫 줄에 쓸 한 문장입니다(예: '재고·주문 도메인 중심의 서비스 기획 3년'). 확인할 것이 없으면 비웁니다.",
    "11. notes는 한국어 문장으로, 사람이 직접 채우거나 확인해야 하는 것을 알려 줍니다.",
    "12. tableOfContents는 빈 배열로 두세요. 목차는 이 서비스가 프로젝트 목록에서 직접 만듭니다.",
  ].join("\n");
}

export function buildPortfolioBuildInput(request: PortfolioBuildRequest): { input: string; truncated: string[] } {
  const prompt = buildPortfolioBuildPrompt(request);
  return {
    input: [
      "아래는 지원자가 보낸 프로젝트와 자료입니다. 여기서만 사실을 뽑아 포트폴리오 설명글 JSON을 만드세요.",
      "",
      prompt.text,
    ].join("\n"),
    truncated: prompt.truncated,
  };
}

export type PortfolioBuildGatewayResult = {
  output: PortfolioBuildOutput;
  execution: { responseId: string; model: string; promptVersion: string; inputTokens: number | null; outputTokens: number | null };
  truncated: string[];
};

export class OpenAIPortfolioBuildGateway {
  constructor(private readonly options: DocumentBuildModelOptions) {}

  async build(request: PortfolioBuildRequest): Promise<PortfolioBuildGatewayResult> {
    const { input, truncated } = buildPortfolioBuildInput(request);
    const called = await callDocumentBuildModel(this.options, {
      schemaName: "portfolio_build",
      schema: z.toJSONSchema(portfolioBuildOutputSchema),
      instructions: buildPortfolioBuildInstructions(),
      input,
    });
    const output = normalizePortfolioBuildOutput(portfolioBuildOutputSchema.parse(JSON.parse(called.outputText) as unknown));
    return {
      output,
      truncated,
      execution: { ...called.execution, promptVersion: PORTFOLIO_BUILD_PROMPT_VERSION },
    };
  }
}

export function createPortfolioBuildGatewayFromEnv() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL_PORTFOLIO_BUILD?.trim() || process.env.OPENAI_MODEL;
  if (!apiKey || !model) throw new Error("OPENAI_API_KEY와 OPENAI_MODEL 서버 환경변수가 필요합니다.");
  return new OpenAIPortfolioBuildGateway({ apiKey, model });
}
