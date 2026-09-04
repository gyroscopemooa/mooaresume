import type { Metadata } from "next";
import { CareerCharacterLocked } from "@/components/career-character-locked";
import { CareerCharacterResult } from "@/components/career-character-result";
import { getCareerAiSample } from "@/domain/career-ai-sample";
import { getRiasecCharacterProfile } from "@/domain/career-interest";

export const metadata: Metadata = { title: "RIASEC 캐릭터 결과 | MOOA Resume", robots: { index: false, follow: false } };

/**
 * 캐릭터 해설은 유료 상품입니다. 결제가 커리어 검사 쪽에 붙기 전까지는 잠급니다.
 *
 * `example=1`만 열어 두는데, 이 경로는 심층해설 예시 안에서 여는 카드입니다.
 * 예시는 사용자 결과와 무관한 고정 샘플이므로 주소로 넘어온 `code`는 무시하고
 * 예시 리포트와 같은 코드로만 그립니다. 그렇게 하지 않으면 `example=1`을 붙이는
 * 것만으로 아무 코드나 전문으로 볼 수 있어 잠금이 의미가 없습니다.
 */
export default async function CareerCharacterPage({ searchParams }: { searchParams: Promise<{ code?: string; example?: string }> }) {
  const { example } = await searchParams;
  if (example !== "1") return <CareerCharacterLocked />;
  return <CareerCharacterResult profile={getRiasecCharacterProfile(getCareerAiSample("interest").code)} example />;
}
