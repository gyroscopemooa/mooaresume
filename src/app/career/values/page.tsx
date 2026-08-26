import type { Metadata } from "next";
import { CareerValuesReflection } from "@/components/career-values-reflection";

export const metadata: Metadata = {
  title: "직업가치 우선순위 정리 | MOOA Resume",
  description: "성장, 안정, 자율성 등 일에서 중요한 기준을 정리해 지원할 회사와 역할을 고르는 데 활용해 보세요.",
  alternates: { canonical: "/career/values" },
};

export default function CareerValuesPage() {
  return <CareerValuesReflection />;
}
