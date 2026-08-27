import type { Metadata } from "next";
import { CareerAssessmentLab } from "@/components/career-assessment-lab";

export const metadata: Metadata = {
  title: "Career Assessment Lab — 디자인 시안 | MOOA Resume",
  robots: { index: false, follow: false },
};

export default function CareerLabPage() {
  return <CareerAssessmentLab />;
}
