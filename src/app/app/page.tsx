import type { Metadata } from "next";
import { AppHome } from "@/components/app-home";

/**
 * 하이브리드 앱의 첫 화면.
 *
 * 같은 Next.js 웹앱 안의 앱 전용 셸입니다. Play에서 설치한 TWA(`com.mooaresume.twa`)의
 * startUrl이 이 주소이고, 일반 브라우저로 열어도 좁은 화면용 배치로 똑같이
 * 동작합니다. 입력·분류·결제·분석은 웹에서 팔고 있는 그 구현을 그대로 씁니다.
 *
 * 검색에는 올리지 않습니다 — 같은 기능의 웹 화면(`/onboarding`, `/quick`,
 * `/pro/*`)이 이미 색인되어 있고, 두 주소가 같은 내용으로 경쟁할 이유가 없습니다.
 */
export const metadata: Metadata = {
  title: "앱 첨삭 입력",
  robots: { index: false, follow: false },
};

export default function AppShellPage() {
  return <AppHome/>;
}
