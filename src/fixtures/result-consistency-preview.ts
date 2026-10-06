import type { ResultDocument, ResultOriginalAnnotation, ResultQuestion } from "@/domain/result-document";
import { stabilityQuestions } from "./quick-stability-case";
import { sampleResultDocument } from "./result-document";

/**
 * 결과 화면의 "질문 줄·글자 수 초과·수정 없음 설명"을 로그인과 DB 없이 눈으로 확인하는 합성 결과.
 * 기관·지원자·내용은 모두 지어낸 것이다(`quick-stability-case.ts`와 같은 글). 실제 고객 결과의 모양을 따라
 * 원문 맨 앞에 "질문: …" 줄을 붙여 두었다. `/dev/result-consistency-preview`(개발 환경에서만 열림)가 쓴다.
 *
 * mixed: 두 문항은 고쳐지고 세 문항은 유지됨. 한 문항은 목표 글자 수를 넘음.
 * keep : 개선점을 짚었지만 모든 문항이 유지됨(검토를 통과한 수정이 없는 경우).
 */
export type ConsistencyPreviewVariant = "mixed" | "keep";

const withQuestionLine = (prompt: string, answer: string) => `질문: ${prompt}\n${answer}`;

function annotation(original: string, phrase: string, type: ResultOriginalAnnotation["type"], comment: string, id: string): ResultOriginalAnnotation {
  const start = original.indexOf(phrase);
  if (start < 0) throw new Error(`미리보기 주석의 문구가 원문에 없습니다: ${phrase}`);
  return { id, phrase, type, comment, start, end: start + phrase.length };
}

const REVISED_2 = stabilityQuestions[1].answer.replace(
  "어떤 기업이든 숫자 몇 개만 보면 문제를 정확히 진단할 수 있다는 자신감을 얻었습니다.",
  "분석해 본 점포들에서는 숫자 몇 개만으로도 문제의 방향을 짚어 볼 수 있다는 자신감을 얻었습니다.",
);
const REVISED_5 = "저는 지역 소멸과 상권 공동화를 중요한 이슈로 생각합니다. 수도권 집중은 지방 상권의 유동인구와 청년 창업 여건에 영향을 줄 수 있고, 임대료가 오르면 소상공인은 폐업 위험이 커질 수 있습니다. 저는 한빛지역개발공사의 상권 활성화 사업이 이 문제를 푸는 데 도움이 될 수 있다고 생각합니다. 공공이 임대료 안정 구역을 지정하고 컨설팅을 지원하면 상권이 회복되는 데 보탬이 될 것입니다. 인턴으로서 현장 자료를 정리해 사업 효과를 점검하는 데 힘을 보태겠습니다.";

export function buildConsistencyPreview(variant: ConsistencyPreviewVariant): ResultDocument {
  const mixed = variant === "mixed";
  const originals = stabilityQuestions.map((question) => withQuestionLine(question.prompt, question.answer));
  const base = (index: number, patch: Partial<ResultQuestion> = {}): ResultQuestion => ({
    id: `preview-${index + 1}`, order: index + 1, title: stabilityQuestions[index].title, prompt: stabilityQuestions[index].title,
    targetLength: stabilityQuestions[index].targetLength ?? 500, originalAnswer: originals[index], revisedAnswer: originals[index],
    revisionReasons: [], highlightedPhrases: [], originalAnnotations: [], ...patch,
  });

  const questions: ResultQuestion[] = [
    base(0, { originalAnnotations: [
      annotation(originals[0], "전통시장 점포 40곳을 직접 방문하고", "good", "방문한 점포 수가 있어 현장 경험이 구체적으로 읽힙니다.", "p-1-1"),
      annotation(originals[0], "거인의 어깨 위에 올라 더 멀리 보는 마음으로", "vague", "비유가 포부를 가립니다. 인턴 기간에 무엇을 해 보고 싶은지를 한 문장으로 먼저 말하면 더 또렷합니다.", "p-1-2"),
    ], verificationNote: "사업 이름과 운영 방식은 공식 자료로 확인한 뒤 제출하세요." }),
    mixed
      ? base(1, { revisedAnswer: REVISED_2, revisionReasons: ["‘어떤 기업이든’처럼 경험 범위를 넘는 일반화를 실제로 분석해 본 대상으로 좁혔습니다. 동아리 경험과 수상은 그대로 두었습니다."], highlightedPhrases: ["분석해 본 점포들에서는"], originalAnnotations: [
        annotation(originals[1], "어떤 기업이든 숫자 몇 개만 보면 문제를 정확히 진단할 수 있다는", "revise", "경험한 범위를 넘는 일반화입니다. 분석해 본 대상으로 좁히면 근거와 맞습니다.", "p-2-1"),
      ] })
      : base(1),
    base(2, { targetLength: 120, originalAnnotations: [
      annotation(originals[2], "단순화하구", "typo", "‘단순화하고’로 써야 합니다.", "p-3-1"),
      annotation(originals[2], "도입하야", "typo", "‘도입하여’로 써야 합니다.", "p-3-2"),
      annotation(originals[2], "주문이 늘어났고", "vague", "얼마나 늘었는지 숫자나 기간이 있으면 결과가 선명해집니다.", "p-3-3"),
    ] }),
    base(3, { originalAnnotations: [annotation(originals[3], "예산의 70%만 쓰고도 행사를 마쳤습니다", "good", "갈등의 결과가 숫자로 닫혀 있습니다.", "p-4-1")] }),
    mixed
      ? base(4, { revisedAnswer: REVISED_5, revisionReasons: ["‘대부분’·‘아주’·‘반드시’처럼 근거 없이 넓힌 단정을 낮추고, 지원자의 주장과 정책 제안은 그대로 남겼습니다."], highlightedPhrases: ["도움이 될 수 있다고 생각합니다"], originalAnnotations: [
        annotation(originals[4], "가장 확실한 방법이라고 생각합니다", "revise", "다른 방법과 비교한 근거가 없어 단정으로 읽힙니다.", "p-5-1"),
      ] })
      : base(4, { originalAnnotations: [annotation(originals[4], "상권이 반드시 살아날 것입니다", "revise", "결과를 보장하는 표현이라 근거를 묻게 됩니다.", "p-5-1")] }),
  ];

  const reasonLines = mixed
    ? ["1번: 비유를 줄이면 원문의 포부가 함께 사라져 원문을 유지합니다.", "2번: 일반화를 경험 범위로 좁혀 주장과 근거가 맞아졌습니다.", "3번: 이번 검토에서는 문장을 바꾸는 이득이 확인되지 않았습니다.", "4번: 갈등의 원인·행동·결과가 모두 있어 그대로 둡니다.", "5번: 단정을 낮추면서 지원자의 정책 제안은 남겼습니다."]
    : stabilityQuestions.map((_, index) => `${index + 1}번: 제안된 수정이 원문의 사실이나 말투를 줄여 채택하지 않았습니다.`);

  return {
    ...sampleResultDocument,
    caseId: `preview-consistency-${variant}`,
    product: "QUICK",
    writingMode: "POLISH",
    isSample: false,
    company: "한빛지역개발공사 (가상 예시)",
    role: "체험형 인턴",
    applicationLabel: "자기소개서 첨삭",
    analyzedAt: "2026-10-06T00:00:00.000Z",
    analysisRun: { provider: "mock", responseId: null, model: "preview", promptVersion: "preview", rubricVersion: "preview", schemaVersion: "1.0", inputTokens: null, outputTokens: null, totalTokens: null },
    readiness: { score: 78, label: "제출 전 사실 확인 단계", summary: "경험은 구체적이고, 일부 단정 표현과 오탈자를 정리하면 좋습니다.", reasons: ["현장 경험이 숫자와 함께 제시되어 있습니다."] },
    attachments: [{ id: "preview-file", filename: "가상 예시.txt", extension: "txt", sizeBytes: 2048, parseStatus: "ready", parserLabel: "텍스트", sectionCount: 5 }],
    candidateProfile: { items: [], snapshotLabel: "QUICK input" },
    priorities: [
      { id: "pr-1", title: "단정 표현의 근거를 확인하세요", description: "‘대부분’·‘반드시’처럼 범위를 넓힌 표현은 읽는 사람이 근거를 묻게 만듭니다.", category: "evidence", severity: "high" },
      { id: "pr-2", title: "결과를 숫자로 닫아 주세요", description: "‘주문이 늘어났다’처럼 정도가 없는 결과는 기여를 가늠하기 어렵습니다.", category: "clarity", severity: "medium" },
      { id: "pr-3", title: "사업 이름과 운영 방식을 확인하세요", description: "공식 자료로 확인되지 않은 기관 정보는 제출 전에 점검해야 합니다.", category: "verification", severity: "medium" },
    ],
    questions,
    requirementMatches: [],
    verificationQuestions: [],
    interviewQuestions: [],
    interviewRisks: [],
    consultingAdvice: [],
    coverageNotes: [],
    editSummary: mixed ? ["개선이 확인된 2개 문항의 수정만 반영했습니다. 나머지는 원문을 유지했습니다."] : ["수정안이 검토를 통과하지 못해 입력한 글을 유지했습니다."],
    revisionQuality: {
      version: "revision-quality-2.0", reviewerResponseId: "preview", reviewerModel: "preview", decision: mixed ? "adopt" : "keep_current",
      reason: reasonLines.join("\n"), beforeScore: 78, candidateScore: mixed ? 82 : 78, inputFingerprint: "preview", contextFingerprint: "preview", parentAnalysisRunId: null, relationship: "new",
    },
  };
}
