import type { Metadata } from "next";
import { PortfolioBuildPanel } from "@/components/portfolio-build-panel";

export const metadata: Metadata = {
  title: "포트폴리오",
  robots: { index: false, follow: false },
};

export default function AppPortfolioRoute() {
  return <PortfolioBuildPanel variant="app"/>;
}
