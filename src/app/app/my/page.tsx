import type { Metadata } from "next";
import { AppMyPage } from "@/components/app-my-page";

export const metadata: Metadata = {
  title: "내 정보",
  robots: { index: false, follow: false },
};

export default function AppMyRoute() {
  return <AppMyPage/>;
}
