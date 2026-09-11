import "server-only";

import { z } from "zod";
import {
  careerInterpretationOutputSchema,
  validateCareerInterpretationOutput,
  type CareerInterpretationOutput,
  type CareerInterpretationRequest,
} from "@/domain/career-ai-contract";
import { callDocumentBuildModel, type DocumentBuildModelOptions } from "@/server/ai/document-build-model";

/** AI 심층해설 모델 호출. 응답 봉투·strict 스키마 처리는 `document-build-model.ts`가 합니다. */

export const CAREER_INTERPRETATION_PROMPT_VERSION = "career-interpretation-2026-09-12";

/**
 * 지시문. 검사 점수는 성격·적성 "판정"이 아니라 "응답 경향"이라는 선을
 * `career-interpretation.ts`(무료 규칙 기반 해설)와 똑같이 지킵니다. 이 게이트웨이는
 * 그 위에 실제 경험·지원 자료를 연결하는 AI 해설을 더하는 유료 기능입니다.
 */
export function buildCareerInterpretationInstructions(): string {
  return [
    "당신은 검사 결과를 커리어 자기이해 자료로 풀어 설명하는 한국어 커리어 상담 도구입니다.",
    "",
    "지켜야 할 것:",
    "1. 합격 확률, 취업 확률, 채용 결과 예측을 절대 말하지 마세요. 진단·장애 등 의료·정신건강 용어도 쓰지 마세요.",
    "2. '당신에게 맞는 직업은 ○○입니다'처럼 직업을 단정하지 마세요. 대신 '이런 환경에서는 이런 점을 확인해 보세요' 식으로 가설과 확인 질문을 제시하세요.",
    "3. 점수는 '높음/보통/낮음' 응답 경향으로만 말하고, 성격을 판정하는 사실처럼 쓰지 마세요.",
    "4. workEnvironmentHypotheses의 각 항목에는 반드시 evidence를 채우세요 — 어느 검사(work_style/interest/work_value)의 어떤 점수·응답 경향에서 나온 가설인지 근거 없이 결론만 쓰지 마세요.",
    "5. experiencePrompts는 사용자가 스스로 답할 수 있는 실제 경험 질문으로 쓰세요(예: '~한 경험이 있나요?'). AI가 경험을 대신 지어내면 안 됩니다.",
    "6. jobPostingQuestions는 채용 공고나 면접에서 사용자가 직접 확인할 수 있는 조건·질문으로 쓰세요.",
    "7. limitations에는 이 해설이 직무 적합도나 채용 결과를 판정하지 않는다는 점을 반드시 포함하세요.",
    "8. resumeText/coverLetterText/jobPostingText가 주어지면 그 안에 실제로 적힌 내용만 근거로 쓰고, 없는 경험이나 자격을 만들지 마세요.",
  ].join("\n");
}

export function buildCareerInterpretationInput(request: CareerInterpretationRequest): string {
  const lines: string[] = ["아래는 사용자의 검사 결과와 (있다면) 직접 제공한 자료입니다. 이 안에서만 근거를 찾아 심층해설 JSON을 만드세요.", ""];
  const renderScores = (label: string, scores?: CareerInterpretationRequest["workStyleScores"]) => {
    if (!scores?.length) return;
    lines.push(`[${label}]`);
    for (const score of scores) lines.push(`- ${score.label}: ${score.score}점 (응답 경향: ${score.level})`);
    lines.push("");
  };
  renderScores("업무성향(work_style) 검사 결과", request.workStyleScores);
  renderScores("직업흥미(interest) 검사 결과", request.interestScores);
  renderScores("직업가치(work_value) 검사 결과", request.workValueScores);
  if (request.resumeText) lines.push("[이력서]", request.resumeText, "");
  if (request.coverLetterText) lines.push("[자기소개서]", request.coverLetterText, "");
  if (request.jobPostingText) lines.push("[채용 공고]", request.jobPostingText, "");
  return lines.join("\n");
}

export type CareerInterpretationGatewayResult = {
  output: CareerInterpretationOutput;
  execution: { responseId: string; model: string; promptVersion: string; inputTokens: number | null; outputTokens: number | null };
};

export class OpenAICareerInterpretationGateway {
  constructor(private readonly options: DocumentBuildModelOptions) {}

  async interpret(request: CareerInterpretationRequest): Promise<CareerInterpretationGatewayResult> {
    const called = await callDocumentBuildModel(this.options, {
      schemaName: "career_interpretation",
      schema: z.toJSONSchema(careerInterpretationOutputSchema),
      instructions: buildCareerInterpretationInstructions(),
      input: buildCareerInterpretationInput(request),
    });
    const output = careerInterpretationOutputSchema.parse(JSON.parse(called.outputText) as unknown);
    const violations = validateCareerInterpretationOutput(output);
    if (violations.length) throw new Error(`모델 응답이 안전 규칙을 어겼습니다: ${violations.join("; ")}`);
    return {
      output,
      execution: { ...called.execution, promptVersion: CAREER_INTERPRETATION_PROMPT_VERSION },
    };
  }
}

export function createCareerInterpretationGatewayFromEnv() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL_CAREER_INTERPRETATION?.trim() || process.env.OPENAI_MODEL;
  if (!apiKey || !model) throw new Error("OPENAI_API_KEY와 OPENAI_MODEL 서버 환경변수가 필요합니다.");
  return new OpenAICareerInterpretationGateway({ apiKey, model });
}
