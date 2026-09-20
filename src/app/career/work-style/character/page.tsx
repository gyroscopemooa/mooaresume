import type { Metadata } from "next";
import { WorkStyleCharacterGate } from "@/components/work-style-character-gate";
import { WorkStyleCharacterResult } from "@/components/work-style-character-result";
import { getCareerAiSample } from "@/domain/career-ai-sample";
import { getWorkStyleTypeById } from "@/domain/work-style-type";

export const metadata: Metadata = { title: "업무성향 캐릭터 결과 | MOOA Resume", robots: { index: false, follow: false } };

/**
 * 직업흥미의 `/career/character`, 직업가치의 `/career/values/character`와 같은 구조.
 * 무료이되 로그인이 필요하다(이유는 `work-style-character-gate.tsx`).
 *
 * `example=1`은 로그인 없이 열린다. 예시는 고정 샘플과 같은 유형으로만 그리고,
 * 주소로 넘어온 `type`은 무시한다(그러지 않으면 로그인 요구를 피해 아무 유형이나 열 수 있다).
 */
export default async function WorkStyleCharacterPage({ searchParams }: { searchParams: Promise<{ type?: string; example?: string }> }) {
  const { type, example } = await searchParams;
  if (example === "1") return <WorkStyleCharacterResult type={getWorkStyleTypeById(getCareerAiSample("work_style").code)} example />;
  return <WorkStyleCharacterGate type={getWorkStyleTypeById(type)} />;
}
