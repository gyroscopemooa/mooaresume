export type QuickSummaryFeedback = {
  summary: string;
  characterCount: number;
  sentenceCount: number;
  paragraphs: number;
  strengths: string[];
  checks: string[];
  nextAction: string;
};

const RESULT_WORDS = /(?:결과|개선|감소|증가|달성|완료|향상|단축|절감|수상|선정)/;
const ACTION_WORDS = /(?:확인|분석|정리|제안|공유|협업|개선|운영|제작|관리|실행|조율)/;
const CONTEXT_WORDS = /(?:문제|과제|상황|당시|배경|목표|요청)/;

function normalize(text: string) {
  return text.replace(/\r\n?/g, "\n").trim();
}

function splitSentences(text: string) {
  return text.match(/[^.!?\n]+(?:[.!?]+|$)/g)?.map((item) => item.trim()).filter(Boolean) ?? [];
}

/**
 * A deliberately local, explainable first-pass check. It never claims a fact
 * is true or false and must not be confused with the paid AI review.
 */
export function createQuickSummaryFeedback(input: string): QuickSummaryFeedback | null {
  const text = normalize(input);
  if (!text) return null;

  const compact = text.replace(/\s/g, "");
  const sentences = splitSentences(text);
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  const firstSentence = sentences[0] ?? text;
  const summary = firstSentence.length > 92 ? `${firstSentence.slice(0, 89).trimEnd()}…` : firstSentence;
  const strengths: string[] = [];
  const checks: string[] = [];

  if (ACTION_WORDS.test(text)) strengths.push("직접 한 행동을 보여주는 표현이 있습니다.");
  if (RESULT_WORDS.test(text)) strengths.push("결과 또는 변화와 연결되는 표현이 있습니다.");
  if (paragraphs.length >= 2) strengths.push("문단을 나눠 읽는 흐름을 만들었습니다.");
  if (!strengths.length) strengths.push("작성한 경험의 흐름을 먼저 확인할 수 있습니다.");

  if (!CONTEXT_WORDS.test(text)) checks.push("어떤 상황·과제에서 시작했는지 한 문장으로 밝혀 보세요.");
  if (!ACTION_WORDS.test(text)) checks.push("내가 직접 판단하거나 실행한 행동을 더 구체적으로 적어 보세요.");
  if (!RESULT_WORDS.test(text)) checks.push("행동 뒤에 달라진 점이 있다면 확인 가능한 범위에서 덧붙여 보세요.");
  if (compact.length < 180) checks.push("초안이 짧습니다. 상황·행동·결과가 모두 보이는지 먼저 확인해 보세요.");
  if (sentences.length === 1 && compact.length > 180) checks.push("긴 문장을 둘로 나누면 핵심 행동과 결과가 더 잘 보입니다.");

  return {
    summary,
    characterCount: compact.length,
    sentenceCount: sentences.length || 1,
    paragraphs: paragraphs.length || 1,
    strengths: strengths.slice(0, 3),
    checks: checks.slice(0, 3),
    nextAction: checks[0] ?? "핵심 경험 하나를 골라 상황 → 행동 → 결과 순서로 다시 읽어 보세요.",
  };
}
