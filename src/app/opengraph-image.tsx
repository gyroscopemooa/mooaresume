import { ImageResponse } from "next/og";

/**
 * 카카오톡·슬랙·네이버에 링크를 공유할 때 뜨는 썸네일.
 *
 * ------------------------------------------------------------------
 * 왜 없었는가, 그리고 왜 지금 만드는가
 * ------------------------------------------------------------------
 * `layout.tsx`의 `openGraph`·`twitter` 메타데이터에는 제목·설명만 있고
 * `images`가 없었습니다. 그러면 미리보기는 텍스트 한 줄로만 뜨거나
 * 아예 뜨지 않습니다 — 링크를 눌러 보기 전까지는 무엇인지 알 수 없습니다.
 *
 * 이 파일 하나로 끝납니다. Next.js가 파일 이름(`opengraph-image.tsx`)만
 * 보고 og:image·twitter:image 태그를 자동으로 붙여 줍니다. 동적 값이
 * 없는 정적 이미지라 **빌드할 때 한 번만** 그려지고, 실제 방문자·크롤러
 * 요청마다 다시 그리지 않습니다.
 *
 * ------------------------------------------------------------------
 * 한글이 안 보이는 함정
 * ------------------------------------------------------------------
 * `ImageResponse`의 렌더러(Satori)는 기본 폰트에 한글 글리프가 없어,
 * 폰트를 직접 넘기지 않으면 한글 자리가 빈 네모로 뜹니다. 여기 쓰는
 * 글자만(`FONT_TEXT`) Google Fonts에 요청해 필요한 글리프만 받습니다 —
 * 폰트 전체를 받는 것보다 훨씬 가볍고, 빌드 시점에 한 번만 받으므로
 * 방문자의 요청 속도와는 무관합니다.
 */

export const alt = "무아레쥬메 — AI 자소서 첨삭";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "AI 자소서 첨삭";
const SUBTITLE = "채용공고와 경험을 연결해, 고칠 이유와 최종본까지";
const BRAND = "무아레쥬메";
const FONT_TEXT = `${TITLE}${SUBTITLE}${BRAND}MOOAResumemooaresume.com`;

/**
 * Google Fonts는 최신 브라우저의 `Accept`를 보내면 WOFF2를 주는데,
 * Satori는 WOFF2를 읽지 못합니다. `fetch`의 기본 헤더는 그 최신
 * 신호가 없어 TTF를 받게 되고, 이게 바로 이 방식이 통하는 이유입니다.
 */
async function loadKoreanFont(text: string): Promise<ArrayBuffer> {
  const cssResponse = await fetch(
    `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`,
  );
  const css = await cssResponse.text();
  const fontUrl = css.match(/src: url\(([^)]+)\)/)?.[1];
  if (!fontUrl) throw new Error("OG_FONT_URL_NOT_FOUND");
  const fontResponse = await fetch(fontUrl);
  return fontResponse.arrayBuffer();
}

export default async function Image() {
  const fontData = await loadKoreanFont(FONT_TEXT);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#f7faf8",
          fontFamily: "Noto Sans KR",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#176b4a",
              color: "#fff",
              fontSize: 38,
              fontWeight: 700,
            }}
          >
            M
          </div>
          <span style={{ fontSize: 30, fontWeight: 700, color: "#176b4a", letterSpacing: -0.5 }}>
            {BRAND}
          </span>
        </div>
        <div style={{ display: "flex", marginTop: 56, fontSize: 76, fontWeight: 700, color: "#14201b", letterSpacing: -2 }}>
          {TITLE}
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: "#5d6b64" }}>
          {SUBTITLE}
        </div>
        <div style={{ display: "flex", marginTop: 64, fontSize: 26, color: "#8b968f" }}>
          mooaresume.com
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Noto Sans KR", data: fontData, weight: 700 }] },
  );
}
