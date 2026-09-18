import type { Metadata } from "next";
import { CareerValuesCharacterGate } from "@/components/career-values-character-gate";
import { CareerValuesCharacterResult } from "@/components/career-values-character-result";
import { getCareerAiSample } from "@/domain/career-ai-sample";
import { getWorkValueCharacterProfile } from "@/domain/career-work-values";

export const metadata: Metadata = { title: "직업가치 캐릭터 결과 | MOOA Resume", robots: { index: false, follow: false } };

/**
 * 직업흥미의 `/career/character`와 같은 구조. 무료·로그인 필요 이유는
 * `career-values-character-gate.tsx`에 적어 두었다.
 *
 * `example=1` 처리도 동일하다 — 예시는 고정 샘플과 같은 코드로만 그리고,
 * 주소로 넘어온 `code`는 무시한다(그러지 않으면 로그인 요구를 피해 아무
 * 코드나 열 수 있다).
 */
export default async function CareerValuesCharacterPage({ searchParams }: { searchParams: Promise<{ code?: string; example?: string }> }) {
  const { code, example } = await searchParams;
  if (example === "1") return <CareerValuesCharacterResult profile={getWorkValueCharacterProfile(getCareerAiSample("work_values").code)} example />;
  return <CareerValuesCharacterGate profile={getWorkValueCharacterProfile(code)} />;
}
