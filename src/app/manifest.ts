import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // TWA(Trusted Web Activity)가 "이 웹앱과 저 Play 앱이 같은 설치"라고
    // 판단하는 안정적인 식별자입니다. start_url과 다르게 두면, 나중에
    // start_url을 바꿔도(예: 캠페인 파라미터) 이미 설치된 사람들이 새 설치로
    // 잡히지 않습니다.
    id: "/",
    name: "MOOA Resume",
    short_name: "MOOA",
    description: "채용공고와 경험을 연결하는 AI 자소서 첨삭 서비스",
    start_url: "/",
    // TWA가 이 오리진의 어디까지를 "이 앱 안"으로 볼지 정합니다. 명시하지
    // 않으면 매니페스트가 있는 경로 기준으로 추정되는데, TWA 신뢰 검증
    // (assetlinks.json)은 이 값을 기준으로 동작하므로 명시해 둡니다.
    scope: "/",
    display: "standalone",
    background_color: "#f7f9f7",
    theme_color: "#176b4a",
    lang: "ko",
    // 없으면 "홈 화면에 추가"가 안드로이드에서는 페이지 스크린샷을,
    // 스플래시 화면에서는 빈 배경을 대신 씁니다. 표준 아이콘("any")과
    // Play/안드로이드 런처의 마스크 아이콘("maskable")을 항목으로 나눠 둡니다
    // — Next.js의 매니페스트 타입이 스펙의 "any maskable" 같은 공백 구분
    // 다중값을 받지 않습니다.
    //
    // maskable은 별도 파일입니다. 런처가 원형·스쿼클로 잘라내기 때문에,
    // 같은 파일을 쓰면 아이콘 아래쪽 "무아레쥬메" 글자가 잘립니다. 원본을
    // 80%로 줄이고 바깥을 아이콘 모서리 색으로 채운 판이 안전영역을 지킵니다.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
