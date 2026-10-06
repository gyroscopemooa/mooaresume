/**
 * 두 글이 얼마나 비슷한지(0~1).
 *
 * 글자 두 개씩 묶은 조각(bigram)이 얼마나 겹치는지로 잰다. 띄어쓰기·줄바꿈·영문 대소문자는 무시한다.
 * 같은 글을 몇 문장만 고친 것은 높게, 주제만 같은 다른 글은 낮게 나온다.
 * AI도 외부 호출도 쓰지 않는 계산이라 같은 입력은 언제나 같은 값이다.
 */
export const normalizeForSimilarity = (text: string) => text.normalize("NFC").toLowerCase().replace(/\s+/g, "");

function bigramCounts(text: string) {
  const counts = new Map<string, number>();
  const characters = Array.from(text);
  for (let index = 0; index < characters.length - 1; index += 1) {
    const key = characters[index] + characters[index + 1];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function diceSimilarity(first: string, second: string): number {
  const a = normalizeForSimilarity(first);
  const b = normalizeForSimilarity(second);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const left = bigramCounts(a);
  const right = bigramCounts(b);
  let total = 0;
  for (const count of left.values()) total += count;
  for (const count of right.values()) total += count;
  if (total === 0) return 0; // 한 글자씩인 서로 다른 글
  let overlap = 0;
  for (const [key, count] of left) overlap += Math.min(count, right.get(key) ?? 0);
  return (2 * overlap) / total;
}
