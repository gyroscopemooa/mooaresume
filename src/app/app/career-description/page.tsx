import type { Metadata } from "next";
import { CareerDescriptionBuildPanel } from "@/components/career-description-build-panel";

export const metadata: Metadata = {
  title: "경력기술서",
  robots: { index: false, follow: false },
};

export default function AppCareerDescriptionRoute() {
  return <CareerDescriptionBuildPanel variant="app"/>;
}
