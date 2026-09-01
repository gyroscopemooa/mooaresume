import type { Metadata } from "next";
import { CommunityLounge } from "@/components/community-lounge";

export const metadata: Metadata = {
  title: "취업/진로 고민 익명게시판",
  description: "취업 준비, 직무·진로, 자소서·면접 고민을 익명으로 정리하고 다음 행동을 찾는 MOOA 커뮤니티 라운지입니다.",
  alternates: { canonical: "/community" },
};

export default function CommunityPage() {
  return <CommunityLounge />;
}