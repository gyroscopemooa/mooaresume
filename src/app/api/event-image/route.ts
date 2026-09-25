import { NextResponse } from "next/server";
import { eventImageFileName, parseEventImageSource } from "@/lib/live-sub-runtime/event-image";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * 이벤트 팝업의 "이미지 저장" 다운로드 통로. HQ 미디어를 그대로 내려주되
 * 첨부 파일(Content-Disposition)로 바꿔 준다. 허용 주소 모양은 event-image.ts 에서 엄격히 제한한다.
 * 화면 렌더·빌드와 무관하고, 사용자가 저장을 눌렀을 때만 호출된다.
 */
export async function GET(request: Request) {
  const source = parseEventImageSource(new URL(request.url).searchParams.get("src"));
  if (!source) return NextResponse.json({ error: "INVALID_IMAGE_SOURCE" }, { status: 400 });

  let upstream: Response;
  try {
    upstream = await fetch(source.url, { redirect: "error", signal: AbortSignal.timeout(8_000), headers: { accept: "image/*" } });
  } catch {
    return NextResponse.json({ error: "IMAGE_UNAVAILABLE" }, { status: 502 });
  }
  const contentType = upstream.headers.get("content-type") ?? "";
  const length = Number(upstream.headers.get("content-length") ?? 0);
  if (!upstream.ok || !contentType.startsWith("image/") || length > MAX_BYTES) {
    return NextResponse.json({ error: "IMAGE_UNAVAILABLE" }, { status: 502 });
  }
  const bytes = await upstream.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) return NextResponse.json({ error: "IMAGE_UNAVAILABLE" }, { status: 502 });

  return new Response(bytes, {
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${eventImageFileName(source)}"`,
      "cache-control": "public, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
}
