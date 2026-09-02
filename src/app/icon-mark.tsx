import { ImageResponse } from "next/og";

/**
 * 홈 화면 아이콘 하나를 여러 크기로.
 *
 * `icon.svg`는 브라우저 탭 파비콘으로 충분하지만, 안드로이드 "홈 화면에
 * 추가"·iOS 홈 화면은 PNG를 특정 크기로 요구합니다. 없으면 안드로이드는
 * 매니페스트에 없는 아이콘을 대신 화면 스크린샷으로 채우고, iOS는 흰
 * 네모에 페이지 글자를 오려 붙입니다 — 둘 다 브랜드가 아닙니다.
 *
 * 로고가 영문 대문자 M 하나뿐이라 한글 글리프가 필요 없고, 그래서
 * `opengraph-image.tsx`처럼 폰트를 따로 받아 올 필요가 없습니다.
 */
export function renderMarkIcon(sizePx: number) {
  // 512px 기준 크기 비율입니다. 코너 반경·글자 크기가 아이콘마다 따로
  // 정해져 있으면 크기를 하나 늘릴 때마다 두 자리를 같이 손봐야 합니다.
  const scale = sizePx / 512;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#176b4a",
          borderRadius: 112 * scale,
        }}
      >
        <span
          style={{
            display: "flex",
            color: "#fff",
            fontSize: 300 * scale,
            fontWeight: 700,
            fontFamily: "Arial, sans-serif",
          }}
        >
          M
        </span>
      </div>
    ),
    { width: sizePx, height: sizePx },
  );
}
