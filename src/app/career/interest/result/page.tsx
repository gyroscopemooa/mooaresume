import type { Metadata } from "next";
import { CareerInterestResult } from "@/components/career-interest-result";
export const metadata: Metadata = { title: "직업흥미 탐색 결과 | MOOA Resume", robots: { index: false, follow: false } };
export default function CareerInterestResultPage() { return <CareerInterestResult />; }
