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
  };
}
