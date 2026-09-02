import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MOOA Resume",
    short_name: "MOOA",
    description: "채용공고와 경험을 연결하는 AI 자소서 첨삭 서비스",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9f7",
    theme_color: "#176b4a",
    lang: "ko",
    // 없으면 "홈 화면에 추가"가 안드로이드에서는 페이지 스크린샷을,
    // 스플래시 화면에서는 빈 배경을 대신 씁니다.
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
