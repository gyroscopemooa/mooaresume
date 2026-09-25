import { runtimeBaseUrls } from "./env";

/**
 * HQ 이벤트 이미지 저장. HQ 미디어 서버는 다른 도메인의 다운로드(CORS)를 허용하지 않아
 * 브라우저만으로는 "저장"이 새 탭 열기로 끝난다. 그래서 같은 도메인의 /api/event-image 를 한 번 거친다.
 *
 * 그 통로가 아무 주소나 대신 받아 주는 곳이 되면 안 되므로, 설정된 HQ 주소의
 * `/api/runtime/media/events/<sha256>.<확장자>` 한 가지 모양만 통과시킨다.
 */
const MEDIA_PATH = /^\/api\/runtime\/media\/events\/([0-9a-f]{64})\.(png|jpe?g|webp|gif)$/;

export type EventImageSource = { url: string; hash: string; extension: string };

export function parseEventImageSource(value: unknown, allowedBaseUrls: readonly string[] = runtimeBaseUrls): EventImageSource | null {
  if (typeof value !== "string" || value.length > 300) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.username || url.password || url.search || url.hash) return null;
  const allowed = allowedBaseUrls.some((base) => { try { return new URL(base).origin === url.origin; } catch { return false; } });
  if (!allowed) return null;
  const match = MEDIA_PATH.exec(url.pathname);
  return match ? { url: url.toString(), hash: match[1], extension: match[2] === "jpeg" ? "jpg" : match[2] } : null;
}

/** 이미지 저장 링크. 허용되지 않는 이미지 주소면 null(저장 버튼을 보이지 않는다). */
export function eventImageDownloadHref(imageUrl: string | undefined, allowedBaseUrls?: readonly string[]): string | null {
  const source = parseEventImageSource(imageUrl, allowedBaseUrls);
  return source ? `/api/event-image?src=${encodeURIComponent(source.url)}` : null;
}

export function eventImageFileName(source: EventImageSource): string {
  return `mooaresume-event-${source.hash.slice(0, 8)}.${source.extension}`;
}
