import type { Metadata } from "next";
import { CareerValuesResult } from "@/components/career-values-result";
export const metadata: Metadata = { title: "직업가치 탐색 결과 | MOOA Resume", robots: { index: false, follow: false } };
export default function CareerValuesResultPage() { return <CareerValuesResult />; }