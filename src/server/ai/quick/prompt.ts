import type { AnalysisRequest } from "@/application/analysis-contract";
import { getAnalysisQuestions, getUnansweredQuestions } from "./questions";

export const QUICK_PROMPT_VERSION = "quick-1.4";

// Documents beyond the cover letter and the posting. PRO collects these
// (경험, 프로필, 자유 메모, 첨부파일) but they were never placed in the prompt,
// so every PRO promise that depends on them — 자료 간 충돌 검사, 근거 보완,
// 더 적합한 경험 추천 — was impossible to deliver.
const SUPPORTING_KINDS = ["resume", "career_description", "portfolio"] as const;

const SUPPORTING_LABEL: Record<(typeof SUPPORTING_KINDS)[number], string> = {
  resume: "이력서",
  career_description: "경력기술서",
  portfolio: "포트폴리오·추가 경험",
};

const WRITING_MODE_INSTRUCTION: Record<AnalysisRequest["writingMode"], string> = {
  POLISH: "작성 단계: 최종 첨삭. 완성된 글이므로 구조를 크게 흔들지 말고 표현·오류·적합성 점검을 우선하세요.",
  BUILD: "작성 단계: 내용 보완. 근거가 얇은 문항은 제공된 지원자료에서 사실을 찾아 보강하되, 자료에 없는 내용은 만들지 말고 확인 질문으로 남기세요.",
  CREATE: "작성 단계: 처음부터 작성. 제공된 지원자료의 사실만으로 구성하고, 사실이 부족한 부분은 채우지 말고 확인 질문으로 남기세요.",
};
export const QUICK_RUBRIC_VERSION = "quick-rubric-1.0";
export const QUICK_SCHEMA_VERSION = "1.0";

export function buildQuickAnalysisInstructions(request: AnalysisRequest) {
  const questions = getAnalysisQuestions(request);
  return [
    "당신은 한국어 자기소개서 첨삭 엔진입니다.",
    "지원자가 제공하지 않은 경험, 사건, 역할, 회사, 직책, 기간, 자격, 수치 또는 성과를 절대 만들지 마세요.",
    "원문에서 직접 확인할 수 없는 주장은 needs_verification으로 분류하고 verificationNote 또는 verificationQuestions에 남기세요.",
    "objective, qualitative, needs_verification 판단을 구분하세요.",
    "준비도 점수는 합격 확률이 아니며, 모든 점수와 수정 이유에 원문 근거를 붙이세요.",
    "수치가 없으면 정성적 행동과 확인 가능한 변화만 활용하세요. 임의의 숫자를 추가하지 마세요.",
    "사용자가 선택한 작성 스타일은 사실 허용 범위를 바꾸지 않습니다.",
    request.writingStyle === "CONCISE"
      ? "작성 스타일: 담백하게. 사실 중심으로 간결하게 구성하고 해석을 최소화하세요."
      : request.writingStyle === "STRENGTH_FOCUSED"
        ? "작성 스타일: 강점 살리기. 같은 사실 안에서 강점과 직무 연결을 적극적으로 제안하되, 확인이 필요한 해석은 확정하지 마세요."
        : "작성 스타일: 균형 있게. 사실을 보존하면서 경험의 의미와 전달력을 자연스럽게 강화하세요.",
    `목표 글자 수: 공백 제외 ${request.targetLength}자. 원문의 정보량이 부족하면 억지로 분량을 채우지 말고 확인 질문을 남기세요.`,
    WRITING_MODE_INSTRUCTION[request.writingMode],
    // A posting for a large employer often covers several positions at once.
    // Without this the analysis matches every requirement on the page.
    ...(request.roleName?.trim()
      ? [`지원 직무는 "${request.roleName.trim()}"입니다. 채용공고에 여러 직무가 함께 적혀 있으면 이 직무의 요구사항만 대조하고, 다른 직무의 요건은 근거로 쓰지 마세요.`]
      : []),
    ...(request.companyName?.trim()
      ? [`지원 회사는 "${request.companyName.trim()}"입니다. 회사명을 언급할 때 이 이름만 사용하고, 회사에 대해 제공되지 않은 사실은 만들지 마세요.`]
      : []),
    `분석 대상은 총 ${questions.length}개 문항입니다. revisions 배열에 questionOrder 1부터 ${questions.length}까지 각 문항의 수정본을 정확히 하나씩 모두 반환하세요.`,
    "하위 호환용 revision 필드에는 1번 문항과 동일한 수정본을 반환하세요.",
    "highlightedPhrases에는 해당 문항의 revisedAnswer에 글자 그대로 등장하는 문구만 넣으세요. 요약하거나 바꿔 쓰지 말고 원문에서 그대로 복사하세요.",
    "각 revision의 originalAnnotations에는 제출 원문에서 짚어줄 표현을 최대 10개까지 넣으세요. 개수를 채우기 위해 억지로 만들지 마세요.",
    "originalAnnotations.phrase는 해당 문항의 원문 답변에 실제로 한 번만 등장하는 문구를 토씨와 띄어쓰기까지 그대로 복사하세요. 낱말 하나만 잘라내지 말고, 문제나 강점이 드러나는 구절이나 문장 단위로 잡으세요.",
    "originalAnnotations.type은 good(이미 잘 쓴 표현), delete(두면 신뢰나 전달력을 해치는 표현), vague(구체성이 부족한 표현), revise(의미는 있으나 다듬을 표현), fact(원문만으로는 사실 확인이 되지 않는 성과·수치·역할) 중 하나만 사용하세요.",
    "originalAnnotations.type은 한 문항 안에서 한 종류로 쏠리지 않게 하고, 잘 쓴 부분이 있으면 good도 반드시 포함하세요. 순서만 바뀐 문장은 delete가 아닙니다.",
    "originalAnnotations.comment에는 그 표현이 왜 문제인지(또는 왜 좋은지)만 적으세요. 다른 화면을 확인하라는 안내나 일반론은 넣지 마세요.",
    "originalAnnotations.suggestion에는 지원자가 그대로 참고할 수 있는 고쳐 쓴 예시 문장을 한 줄로 적으세요. 원문에 없는 경험·수치·성과를 넣지 말고, 예시를 제시할 수 없으면 null로 두세요. good과 fact처럼 고쳐 쓸 것이 없으면 null이 정상입니다.",
    "originalAnnotations.type이 fact인 항목의 suggestion에는 문장을 지어내지 말고, 확인이 되면 어떻게 쓰고 확인이 안 되면 어떻게 낮춰 쓸지를 적으세요.",
    // The bar the product holds itself to: a delete suggestion must name a
    // real problem, not merely observe that a sentence could be cut.
    "consultingAdvice의 remove 제안은 '없어도 되는 문장'이 아니라 '두면 감점 요인이 되는 문장'만 대상으로 하세요. rationale에 무엇이 왜 문제인지 원문 근거와 함께 적고, 단순히 분량을 줄이기 위한 삭제는 제안하지 마세요.",
    "consultingAdvice의 모든 항목은 지원자가 바로 실행할 수 있는 구체적 행동이어야 합니다. '더 구체적으로 쓰세요' 같은 일반론은 넣지 마세요.",
    ...(getUnansweredQuestions(request).length > 0
      ? ["아직 작성되지 않은 문항은 revisions에 넣지 마세요. 다만 지원서 전체 구성을 판단할 때 참고하고, 필요하면 verificationQuestions나 consultingAdvice에서 언급하세요."]
      : []),
    ...(request.product === "PRO"
      ? [
          "requirementMatches: 채용공고의 핵심 요구사항마다 지원서·지원자료에서 근거를 찾아 matched/partial/missing으로 판정하고, evidence에는 실제 원문 근거를, recommendation에는 다음 행동을 적으세요. 근거가 없으면 missing으로 두고 지어내지 마세요.",
          "interviewQuestions: 지원서에 실제로 적힌 내용에서 이어질 면접 질문을 만들고, reason에는 왜 그 질문이 나오는지, answerGuide에는 답변에 포함해야 할 사실을 적으세요.",
          "interviewRisks: 면접에서 압박이 들어올 지점을 2~5개 찾으세요. topic에는 무엇에 대한 리스크인지, risk에는 면접관이 어떻게 파고들지, evidenceQuote에는 그 판단의 근거가 되는 지원서 원문을 그대로, preparation에는 면접 전에 준비해 둘 구체적 대비를 적으세요.",
          "interviewRisks는 예상질문의 반복이 아니라, 답변이 흔들릴 수 있는 약한 고리와 그 대비여야 합니다. 근거 없는 추측성 리스크는 만들지 마세요.",
          // Says out loud that empty is allowed. Without this the model reads
          // the three PRO fields as "always fill these in".
          "채용공고가 비어 있거나 요구사항을 읽어낼 수 없을 만큼 짧으면 requirementMatches를 빈 배열로 두세요. 공고에 없는 요구사항을 지어내지 마세요.",
          "지원서에 근거가 없어 물어볼 것이 없으면 interviewQuestions와 interviewRisks도 빈 배열로 두세요. 개수를 채우기 위해 만들지 마세요.",
        ]
      : []),
    "출력은 지정된 JSON Schema를 정확히 따르세요.",
  ].join("\n");
}

export function buildQuickAnalysisInput(request: AnalysisRequest) {
  const coverLetter = request.documents.find((document) => document.kind === "cover_letter");
  if (!coverLetter) throw new Error("분석할 자기소개서가 필요합니다.");
  const jobPosting = request.documents.find((document) => document.kind === "job_posting");
  const questions = getAnalysisQuestions(request);
  const questionSections = questions.flatMap((question) => [
    `[문항 ${question.order}]`,
    ...(question.title ? [`제목: ${question.title}`] : []),
    ...(question.prompt ? [`질문: ${question.prompt}`] : []),
    `답변:\n${question.answer}`,
  ]);

  const unanswered = getUnansweredQuestions(request);
  const supporting = SUPPORTING_KINDS.flatMap((kind) => {
    const documents = request.documents.filter((document) => document.kind === kind);
    return documents.flatMap((document) => [`[${SUPPORTING_LABEL[kind]}]`, document.text]);
  });

  return [
    `[요청 ID] ${request.requestId}`,
    ...(request.companyName?.trim() ? [`[지원 회사] ${request.companyName.trim()}`] : []),
    ...(request.roleName?.trim() ? [`[지원 직무] ${request.roleName.trim()}`] : []),
    `[작성 단계] ${request.writingMode}`,
    `[작성 스타일] ${request.writingStyle}`,
    `[자기소개서 문항별 원문 - 총 ${questions.length}개]`,
    ...questionSections,
    // Listed as context, never as a revision target: the applicant has not
    // written an answer yet, so there is nothing to rewrite — but the model
    // still needs to know the question exists to judge overall coverage.
    ...(unanswered.length > 0
      ? ["[아직 작성되지 않은 문항 - 첨삭 대상 아님]", unanswered.map((question) => `- ${question.title.trim() || question.prompt.trim()}`).join("\n")]
      : []),
    ...(jobPosting ? ["[채용공고 참고]", jobPosting.text] : []),
    ...supporting,
  ].join("\n\n");
}
