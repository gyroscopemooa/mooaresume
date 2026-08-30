import type { Metadata } from "next";
import { CareerAssessmentStyleLab } from "@/components/career-assessment-style-lab";
export const metadata: Metadata = { title: "Assessment Style Study", robots: { index: false, follow: false } };
export default function AssessmentStylesPage() { return <CareerAssessmentStyleLab />; }