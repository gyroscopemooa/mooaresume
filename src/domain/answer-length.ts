/** Employer constraints and a desired writing length are different contracts. */
export function readAnswerLimit(prompt: string) {
  const max = prompt.match(/최대\s*([\d,]+)\s*자/) ?? prompt.match(/([\d,]+)\s*자\s*(?:이내|이하)/);
  const min = prompt.match(/최소\s*([\d,]+)\s*자/);
  const number = (value?: string) => value ? Number(value.replaceAll(",", "")) : null;
  return { max: number(max?.[1]), min: number(min?.[1]), basis: /공백\s*제외/.test(prompt) ? "compact" : /공백\s*포함/.test(prompt) ? "inclusive" : "unknown" } as const;
}

export function describeAnswerLength(answer: string, prompt: string, target: number) {
  const limit = readAnswerLimit(prompt);
  const compact = answer.replace(/\s/g, "").length;
  const inclusive = answer.replace(/\r\n?/g, "\n").length;
  const count = limit.basis === "compact" ? compact : inclusive;
  if (!limit.max && !limit.min) return `공백 제외 ${compact}자 · 포함 ${inclusive}자 / 희망 분량 ${target}자 (필수 최소 분량 아님)`;
  const status = limit.basis === "unknown" ? "공백 계산 기준은 채용 입력창에서 확인"
    : limit.max && count > limit.max ? `${count - limit.max}자 초과`
    : limit.min && count < limit.min ? `${limit.min - count}자 미달` : "기재된 분량 조건 충족";
  return `공백 제외 ${compact}자 · 포함 ${inclusive}자 / ${limit.min ? `최소 ${limit.min}자 · ` : ""}${limit.max ? `최대 ${limit.max}자 · ` : ""}${status}`;
}
