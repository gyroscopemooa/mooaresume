import type { Metadata } from "next";
import { CareerCharacterGate } from "@/components/career-character-gate";
import { CareerCharacterResult } from "@/components/career-character-result";
import { getCareerAiSample } from "@/domain/career-ai-sample";
import { getRiasecCharacterProfile } from "@/domain/career-interest";

export const metadata: Metadata = { title: "RIASEC 캐릭터 결과 | MOOA Resume", robots: { index: false, follow: false } };

/**
 * 캐릭터 해설은 무료이되 로그인이 필요합니다. 그 판단의 근거는
 * `career-character-gate.tsx`에 적어 두었습니다.
 *
 * `example=1`은 로그인 없이 열립니다. 이 경로는 심층해설 예시 안에서 여는
 * 카드이고, 예시는 사용자 결과와 무관한 고정 샘플이라 로그인을 물을 것이
 * 없습니다. 다만 주소로 넘어온 `code`는 무시하고 예시 리포트와 같은 코드로만
 * 그립니다 — 그러지 않으면 `example=1`을 붙이는 것만으로 로그인 요구를 피해
 * 아무 코드나 열 수 있습니다.
 */
export default async function CareerCharacterPage({ searchParams }: { searchParams: Promise<{ code?: string; example?: string }> }) {
  const { code, example } = await searchParams;
  if (example === "1") return <CareerCharacterResult profile={getRiasecCharacterProfile(getCareerAiSample("interest").code)} example />;
  return <CareerCharacterGate profile={getRiasecCharacterProfile(code)} />;
}
