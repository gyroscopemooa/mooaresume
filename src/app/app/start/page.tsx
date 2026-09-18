import type { Metadata } from "next";
import { AppStartWizard } from "@/components/app-start-wizard";

/**
 * 앱 "시작" 메뉴. 단계 → 상품을 고르고 첨삭 홈으로 넘깁니다.
 *
 * 온보딩처럼 한 번만 지나가는 화면이 아니라 하단 메뉴에 계속 있는 자리입니다 —
 * 두 번째 지원서를 쓸 때도 같은 도움이 필요합니다.
 */
export const metadata: Metadata = {
  title: "시작하기",
  robots: { index: false, follow: false },
};

export default function AppStartRoute() {
  return <AppStartWizard/>;
}
