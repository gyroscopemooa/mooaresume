import type { Metadata } from "next";
import { CareerCharacterResult } from "@/components/career-character-result";
import { getRiasecCharacterProfile } from "@/domain/career-interest";

export const metadata: Metadata = { title: "RIASEC 캐릭터 결과 | MOOA Resume", robots: { index: false, follow: false } };

export default async function CareerCharacterPage({ searchParams }: { searchParams: Promise<{ code?: string; example?: string }> }) {
  const { code, example } = await searchParams;
  return <CareerCharacterResult profile={getRiasecCharacterProfile(code)} example={example === "1"} />;
}