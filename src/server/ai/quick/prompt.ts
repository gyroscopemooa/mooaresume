import type { AnalysisRequest } from "@/application/analysis-contract";

export const QUICK_PROMPT_VERSION = "quick-1.0";
export const QUICK_RUBRIC_VERSION = "quick-rubric-1.0";
export const QUICK_SCHEMA_VERSION = "1.0";

export function buildQuickAnalysisInstructions(request: AnalysisRequest) {
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
    "각 문항마다 지원자가 제출한 원문에서 실제로 있는 문구를 찾아 originalAnnotations로 표시하세요.",
    "originalAnnotations의 phrase는 원문 문장에서 토씨 하나 바꾸지 않고 그대로 복사하세요.",
    "phrase는 원문에서 한 번만 등장하는, 의미를 알아볼 수 있을 만큼 충분히 길고 고유한 구절을 고르세요. 같은 표현이 원문에 여러 번 나온다면 그 표현만 쓰지 말고 앞뒤 맥락을 포함해 고유하게 특정하세요.",
    "type은 good(원문에서 이미 잘 쓴 표현) · delete(불필요하거나 신뢰를 깎는 표현) · vague(모호하고 구체성이 부족한 표현) · revise(의미는 있으나 다듬으면 좋은 표현) 중 하나로 분류하세요.",
    "comment에는 그렇게 판단한 이유를 자유롭게 서술하세요.",
    "문항당 originalAnnotations는 최대 20개까지 가능하지만 개수를 채우려 하지 마세요. 이미 잘 쓴 짧은 답변은 2~3개만 있어도 정상입니다.",
    "출력은 지정된 JSON Schema를 정확히 따르세요.",
  ].join("\n");
}

export function buildQuickAnalysisInput(request: AnalysisRequest) {
  const coverLetter = request.documents.find((document) => document.kind === "cover_letter");
  if (!coverLetter) throw new Error("분석할 자기소개서가 필요합니다.");
  const jobPosting = request.documents.find((document) => document.kind === "job_posting");

  return [
    `[요청 ID] ${request.requestId}`,
    `[작성 단계] ${request.writingMode}`,
    `[작성 스타일] ${request.writingStyle}`,
    "[자기소개서 원문]",
    coverLetter.text,
    ...(jobPosting ? ["[채용공고 참고]", jobPosting.text] : []),
  ].join("\n\n");
}
