import { renderMarkIcon } from "./icon-mark";

/**
 * iOS "홈 화면에 추가" 아이콘.
 *
 * 없으면 iOS는 페이지를 캡처해 아이콘으로 씁니다 — 대개 흰 배경에 글자
 * 일부만 잘려 나온 모양이 됩니다. 파일 이름만으로 Next.js가
 * `<link rel="apple-touch-icon">`을 자동으로 붙여 줍니다.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderMarkIcon(size.width);
}
