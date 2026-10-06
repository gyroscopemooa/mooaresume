import { diceSimilarity, normalizeForSimilarity } from "./text-similarity";

/**
 * "같은 계정에서 전에 첨삭한 비슷한 글이 있다"를 가려내는 규칙.
 *
 * 쓰이는 곳은 결과 화면의 안내 한 줄뿐이다. 이 판정은 분석에도, 점수에도, 이전 결과를 기준점으로 삼는 일에도
 * 쓰이지 않는다(그것은 글자까지 똑같은 입력에만 하는 별개의 규칙 `matchPreviousRevision`이다).
 * 그래서 "비슷하다"고 잘못 말하는 쪽이 놓치는 쪽보다 나쁘다 — 기준을 높게 잡았다.
 */

/** 이 값 이상이면 같은 글을 조금 고친 것으로 본다(문항 하나 기준). */
export const SIMILAR_TEXT_THRESHOLD = 0.8;
/** 지금 글의 문항 중 이 비율 이상이 전에 쓴 글과 비슷해야 "비슷한 글"이다. */
export const SIMILAR_SHARE_THRESHOLD = 0.6;
/** 이보다 짧은 글은 우연히 겹치기 쉬워 비교하지 않는다(공백 제외 글자 수). */
export const MIN_COMPARABLE_CHARACTERS = 40;

export type EarlierAnalysis = {
  analysisRunId: string;
  analyzedAt: string;
  questions: readonly { originalAnswer: string; revisedAnswer: string }[];
};
export type SimilarEarlier = { analysisRunId: string; analyzedAt: string };

const comparable = (text: string) => normalizeForSimilarity(text).length >= MIN_COMPARABLE_CHARACTERS;

/**
 * `earlier`는 같은 계정의 전에 첨삭한 결과를 최근 순으로 담는다. 조건을 넘는 가장 최근 것을 돌려준다.
 *
 * 문항 순서·개수가 달라도 되도록 문항마다 전에 쓴 글 전체와 견준다. 전에 쓴 글에는 첨삭 받기 전 원문뿐 아니라
 * 첨삭본도 포함한다 — 지난번 첨삭본을 그대로 다시 넣어 본 경우도 "비슷한 글"이다.
 */
export function findSimilarEarlierAnalysis(currentOriginals: readonly string[], earlier: readonly EarlierAnalysis[]): SimilarEarlier | null {
  const current = currentOriginals.filter(comparable);
  if (current.length === 0) return null;
  for (const entry of earlier) {
    const candidates = entry.questions.flatMap((question) => [question.originalAnswer, question.revisedAnswer]).filter(comparable);
    if (candidates.length === 0) continue;
    const matched = current.filter((text) => candidates.some((candidate) => diceSimilarity(text, candidate) >= SIMILAR_TEXT_THRESHOLD)).length;
    if (matched / current.length >= SIMILAR_SHARE_THRESHOLD) return { analysisRunId: entry.analysisRunId, analyzedAt: entry.analyzedAt };
  }
  return null;
}
