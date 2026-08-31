import type { Metadata } from "next";
import { CareerAiSampleDesignThree } from "@/components/career-ai-sample-design-three";
import { getCareerAiSample } from "@/domain/career-ai-sample";

export const metadata: Metadata = { title: "AI 심층해설 결과 | MOOA Resume", robots: { index: false, follow: false } };

export default async function CareerAiSamplePage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { scope } = await searchParams;
  return <CareerAiSampleDesignThree scope={getCareerAiSample(scope).scope} />;
}