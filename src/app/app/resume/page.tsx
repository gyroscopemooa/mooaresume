import type { Metadata } from "next";
import { AppResumePage } from "@/components/app-resume-page";

export const metadata: Metadata = {
  title: "이력서",
  robots: { index: false, follow: false },
};

export default function AppResumeRoute() {
  return <AppResumePage/>;
}
