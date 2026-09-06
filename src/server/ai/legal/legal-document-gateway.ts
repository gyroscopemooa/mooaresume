import "server-only";

import { z } from "zod";
import {
  buildLegalCasePrompt,
  findLegalDocumentDefinition,
  legalDocumentOutputSchema,
  normalizeLegalDocumentOutput,
  LEGAL_DISCLAIMER,
  type LegalCase, type LegalCaseMaterial, type LegalDocumentOutput, type LegalDocumentType,
} from "@/domain/legal-case";
import { callDocumentBuildModel, type DocumentBuildModelOptions } from "@/server/ai/document-build-model";

/**
 * 법률 문서 생성의 모델 호출.
 *
 * 문서 열 종류가 이 파일 하나를 같이 씁니다. 종류마다 게이트웨이를 두면 새
 * 문서를 더할 때마다 갈래가 하나씩 늘고, 공통 규칙(지어내지 않기·기한 계산
 * 금지)을 한 곳에서 고칠 수 없게 됩니다. 종류별 차이는 도메인의
 * `LegalDocumentDefinition.guide`가 만듭니다.
 */

export const LEGAL_DOCUMENT_PROMPT_VERSION = "legal-document-2026-09-06";

/**
 * 공통 규칙.
 *
 * 취업 문서와 위험도가 다릅니다. 저쪽에서 지어낸 문장은 면접에서 걸리지만,
 * 여기서 지어낸 날짜는 소송을 끝냅니다. 그래서 **기한 계산을 아예 금지**합니다
 * — 항소기간처럼 놓치면 되돌릴 수 없는 값을 모델의 산수에 맡길 수 없습니다.
 */
function commonInstructions(): string {
  return [
    "당신은 한국 법원에 낼 서면의 초안을 정리하는 도구입니다. 변호사가 아니며 법률 자문을 하지 않습니다.",
    "",
    "모든 문서에서 지켜야 할 것:",
    "1. 자료에 없는 사실·날짜·금액·당사자·계약 내용을 절대 만들지 마세요. 확인되지 않으면 비워 두고 notes에 무엇이 없는지 적습니다.",
    "2. 날짜와 기한을 직접 계산하지 마세요. '판결문을 송달받은 날부터 정해진 기간 안에'처럼 기준만 적고, 구체적 날짜는 본인이 확인하도록 deadlines와 notes에 안내합니다. 기한을 잘못 계산하면 되돌릴 수 없습니다.",
    "3. 승소 가능성, 확률, '이길 것 같다'는 평가를 적지 마세요.",
    "4. 법령 조문이나 판례를 인용할 때는 자료에 있는 것만 씁니다. 조문 번호나 사건번호를 기억으로 지어내지 마세요.",
    "5. 사실과 주장을 구분해 씁니다. 당사자의 주장은 '주장한다'로, 자료로 확인되는 것은 사실로 적습니다.",
    "6. 각 절(section)의 evidence에는 그 내용이 어느 자료에서 나왔는지 짧게 적습니다.",
    "7. notes에는 사람이 직접 채우거나 확인해야 하는 것을 한국어 문장으로 적습니다. 빈 자리를 남길 때는 반드시 여기에 이유를 적습니다.",
    "8. 쓰지 않는 배열(issues, evidenceItems, deadlines)은 빈 배열로 두세요. 억지로 채우지 마세요.",
    "9. title에는 문서 이름을(예: '준비서면'), headline에는 이 문서가 무엇을 말하는지 한 줄로 적습니다.",
  ].join("\n");
}

export function buildLegalDocumentInstructions(docType: LegalDocumentType): string {
  const definition = findLegalDocumentDefinition(docType);
  return [
    commonInstructions(),
    "",
    `이번에 만들 문서: ${definition.label}`,
    `이 문서를 쓰는 때: ${definition.whenToUse}`,
    "",
    "이 문서에만 해당하는 규칙:",
    ...definition.guide.map((line, index) => `${index + 1}. ${line}`),
  ].join("\n");
}

export type LegalDocumentGatewayResult = {
  output: LegalDocumentOutput;
  execution: { responseId: string; model: string; promptVersion: string; inputTokens: number | null; outputTokens: number | null };
  truncated: string[];
};

export class OpenAILegalDocumentGateway {
  constructor(private readonly options: DocumentBuildModelOptions) {}

  async build(input: {
    docType: LegalDocumentType;
    legalCase: Pick<LegalCase, "title" | "caseType" | "myRole" | "summary">;
    materials: readonly Pick<LegalCaseMaterial, "kind" | "filename" | "text">[];
  }): Promise<LegalDocumentGatewayResult> {
    const prompt = buildLegalCasePrompt({ legalCase: input.legalCase, materials: input.materials, docType: input.docType });
    const called = await callDocumentBuildModel(this.options, {
      schemaName: "legal_document",
      schema: z.toJSONSchema(legalDocumentOutputSchema),
      instructions: buildLegalDocumentInstructions(input.docType),
      input: [
        "아래는 당사자가 올린 사건 자료입니다. 여기서만 사실을 뽑아 문서 JSON을 만드세요.",
        "",
        prompt.text,
      ].join("\n"),
      maxOutputTokens: 12_000,
    });

    const parsed = normalizeLegalDocumentOutput(legalDocumentOutputSchema.parse(JSON.parse(called.outputText) as unknown));
    return {
      // 고지 문구는 모델이 아니라 우리가 붙입니다. 모델이 빠뜨릴 수 있는 자리에
      // 두면 어떤 문서에는 없게 됩니다.
      output: { ...parsed, notes: [...parsed.notes, LEGAL_DISCLAIMER] },
      truncated: prompt.truncated,
      execution: { ...called.execution, promptVersion: LEGAL_DOCUMENT_PROMPT_VERSION },
    };
  }
}

export function createLegalDocumentGatewayFromEnv() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL_LEGAL_BUILD?.trim() || process.env.OPENAI_MODEL;
  if (!apiKey || !model) throw new Error("OPENAI_API_KEY와 OPENAI_MODEL 서버 환경변수가 필요합니다.");
  return new OpenAILegalDocumentGateway({ apiKey, model });
}
