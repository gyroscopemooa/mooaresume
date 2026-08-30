import type { Metadata } from "next";
import { CareerPublicHome } from "@/components/career-public-home";

export const metadata: Metadata = {
  // Same search intent as /career/assessments but a different promise: this
  // page is the entry, that one is the list. Titles that read identically make
  // Google pick one and drop the other.
  // absolute: the root layout appends "| MOOA Resume", which would leave the
  // brand twice over — once in Korean, once in English.
  title: { absolute: "무료 커리어 검사 | 직업적성·업무성향·직업가치관검사 - 무아레쥬메" },
  description: "직업흥미검사·업무성향검사·직업가치관검사를 무료로 진행합니다. 결과는 커리어프로파일로 모여 진로탐색과 지원서 준비로 이어집니다. 채용 판정이 아닌 커리어 탐색용 도구입니다.",
  keywords: ["커리어검사", "직업검사", "진로검사", "직업적성검사", "직업성향검사", "커리어탐색", "진로탐색", "커리어프로파일", "무료 진로검사"],
  alternates: { canonical: "/career" },
};

export default function CareerPage() { return <CareerPublicHome />; }
