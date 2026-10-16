import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { LocalInterviewProPrototype } from "@/components/interview-prototype/local-interview-prototype";

export const metadata: Metadata = {
  title: "면접 PRO V2 로컬 시안",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#17324d",
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default function InterviewProV2DevPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <LocalInterviewProPrototype />;
}
