import type { Metadata } from "next";
import { CareerProfileSave } from "@/components/career-profile-save";

export const metadata: Metadata = {
  title: "커리어 결과 저장 | MOOA Resume",
  description: "완료한 커리어 탐색 결과를 내 계정에 안전하게 저장합니다.",
  robots: { index: false, follow: false },
};

export default function CareerProfileSavePage() {
  return <CareerProfileSave />;
}
