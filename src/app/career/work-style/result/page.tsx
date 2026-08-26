import type { Metadata } from "next";
import { WorkStyleResult } from "@/components/work-style-result";

export const metadata: Metadata = { title: "업무성향 분석 결과", robots: { index: false, follow: false } };

export default function WorkStyleResultPage() { return <WorkStyleResult />; }
